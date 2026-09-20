// controllers/refund.controller.js
import mongoose from "mongoose";
import Refund from "../models/Refund.js";
import Payment from "../models/Payment.js";
import Appointment from "../models/Appointment.js";

/**
 * Helper: standard API response
 */

const isAdminOrOwner = (req) =>
  req.user?.role === "admin" || req.user?.role === "owner";

const ensureRefundAccess = (req, payment) => {
  if (isAdminOrOwner(req)) {
    return;
  }

  if (
    !req.user?.mongoId ||
    !payment?.customer ||
    payment.customer.toString() !== req.user.mongoId.toString()
  ) {
    throw Object.assign(new Error("Refund not found"), {
      status: 404,
    });
  }
};


const respond = (res, status, success, message, data = null) =>
  res.status(status).json({ success, message, ...(data && { data }) });

const VALID_REASONS = [
  "customer_cancellation",
  "barber_cancellation",
  "no_show_exception",
  "duplicate_payment",
  "admin_refund",
  "other",
];

/**
 * @desc    Create a refund for a payment
 * @route   POST /api/refunds
 * @access  Private/Admin
 */
export const createRefund = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const {
      payment: paymentId,
      amount,
      reason = "other",
      note,
      providerRefundId,
      providerResponse,
      initiatedBy,
    } = req.body;

    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return respond(res, 400, false, "Valid payment id is required");
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return respond(res, 400, false, "A valid refund amount is required");
    }
    if (!VALID_REASONS.includes(reason)) {
      return respond(res, 400, false, "Invalid refund reason");
    }

    let refund;

    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw Object.assign(new Error("Payment not found"), { status: 404 });
      }

      // Only completed / partially_refunded payments can be refunded
      if (!["completed", "partially_refunded"].includes(payment.status)) {
        throw Object.assign(
          new Error(`Cannot refund a payment with status "${payment.status}"`),
          { status: 400 }
        );
      }

      const remaining = payment.amount - (payment.refundedAmount || 0);
      const refundAmount = Number(amount);

      if (refundAmount > remaining) {
        throw Object.assign(
          new Error(`Refund amount exceeds remaining refundable balance (${remaining})`),
          { status: 400 }
        );
      }

      // Duplicate providerRefundId check (idempotency)
      if (providerRefundId) {
        const existing = await Refund.findOne({ providerRefundId }).session(session);
        if (existing) {
          throw Object.assign(
            new Error("Refund with this providerRefundId already exists"),
            { status: 409 }
          );
        }
      }

      // Create refund record
      const created = await Refund.create(
        [
          {
            payment: payment._id,
            appointment: payment.appointment,
            provider: payment.provider,
            providerRefundId,
            amount: refundAmount,
            currency: payment.currency,
            reason,
            status: "pending",
            initiatedBy: initiatedBy || req.user?._id || null,
            note,
            providerResponse,
          },
        ],
        { session }
      );
      refund = created[0];

      // Update payment refunded amount + status
      payment.refundedAmount = (payment.refundedAmount || 0) + refundAmount;
      payment.status =
        payment.refundedAmount >= payment.amount ? "refunded" : "partially_refunded";
      await payment.save({ session });

      // Update appointment payment status to refunded when fully refunded
      if (payment.status === "refunded") {
        await Appointment.findByIdAndUpdate(
          payment.appointment,
          { paymentStatus: "refunded" },
          { session }
        );
      }
    });

    return respond(res, 201, true, "Refund created successfully", refund);
  } catch (error) {
    console.error("createRefund error:", error);
    return respond(res, error.status || 500, false, error.message);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Mark a refund as completed (after PayPal confirm)
 * @route   PATCH /api/refunds/:id/complete
 * @access  Private/Admin
 */
export const completeRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { providerRefundId, providerResponse } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid refund id");
    }

    const refund = await Refund.findById(id);
    if (!refund) return respond(res, 404, false, "Refund not found");

    if (refund.status === "completed") {
      return respond(res, 400, false, "Refund is already completed");
    }

    refund.status = "completed";
    if (providerRefundId) refund.providerRefundId = providerRefundId;
    if (providerResponse) refund.providerResponse = providerResponse;

    await refund.save();

    return respond(res, 200, true, "Refund marked as completed", refund);
  } catch (error) {
    console.error("completeRefund error:", error);
    return respond(res, 500, false, error.message);
  }
};

/**
 * @desc    Mark a refund as failed
 * @route   PATCH /api/refunds/:id/fail
 * @access  Private/Admin
 */
export const failRefund = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const { providerResponse, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid refund id");
    }

    let refund;

    await session.withTransaction(async () => {
      refund = await Refund.findById(id).session(session);
      if (!refund) throw Object.assign(new Error("Refund not found"), { status: 404 });

      if (refund.status === "completed") {
        throw Object.assign(
          new Error("Cannot fail an already completed refund"),
          { status: 400 }
        );
      }
      if (refund.status === "failed") {
        throw Object.assign(new Error("Refund is already marked as failed"), {
          status: 400,
        });
      }

      refund.status = "failed";
      if (providerResponse) refund.providerResponse = providerResponse;
      if (note) refund.note = note;
      await refund.save({ session });

      // Rollback the refundedAmount on the Payment since refund failed
      const payment = await Payment.findById(refund.payment).session(session);
      if (payment) {
        payment.refundedAmount = Math.max(
          0,
          (payment.refundedAmount || 0) - refund.amount
        );

        // Recompute status
        if (payment.refundedAmount <= 0) payment.status = "completed";
        else if (payment.refundedAmount < payment.amount)
          payment.status = "partially_refunded";
        else payment.status = "refunded";

        await payment.save({ session });
      }
    });

    return respond(res, 200, true, "Refund marked as failed", refund);
  } catch (error) {
    console.error("failRefund error:", error);
    return respond(res, error.status || 500, false, error.message);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get all refunds (filters + pagination + sorting)
 * @route   GET /api/refunds
 * @access  Private/Admin
 */
export const getRefunds = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      reason,
      provider,
      payment,
      appointment,
      initiatedBy,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (reason) filter.reason = reason;
    if (provider) filter.provider = provider;
    if (payment) filter.payment = payment;
    if (appointment) filter.appointment = appointment;
    if (initiatedBy) filter.initiatedBy = initiatedBy;

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate("payment", "amount currency status providerOrderId")
        .populate("appointment", "date time status")
        .populate("initiatedBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Refund.countDocuments(filter),
    ]);

    return respond(res, 200, true, "Refunds fetched successfully", {
      refunds,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getRefunds error:", error);
    return respond(res, 500, false, error.message);
  }
};

/**
 * @desc    Get a single refund by ID
 * @route   GET /api/refunds/:id
 * @access  Private/Admin
 */
export const getRefundById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid refund id");
    }

    const refund = await Refund.findById(id)
      .populate("payment", "customer amount currency status providerOrderId")
      .populate("appointment")
      .populate("initiatedBy", "name email");

    if (!refund) {
      return respond(res, 404, false, "Refund not found");
    }

    try {
      ensureRefundAccess(req, refund.payment);
    } catch (error) {
      return respond(res, 404, false, "Refund not found");
    }

    return respond(
      res,
      200,
      true,
      "Refund fetched successfully",
      refund
    );
  } catch (error) {
    console.error("getRefundById error:", error);

    return respond(
      res,
      500,
      false,
      "Unable to fetch refund"
    );
  }
};

/**
 * @desc    Get refunds for a specific payment
 * @route   GET /api/refunds/payment/:paymentId
 * @access  Private/Admin
 */
export const getRefundsByPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return respond(res, 400, false, "Invalid payment id");
    }

    const payment = await Payment.findById(paymentId).select(
      "customer"
    );

    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    try {
      ensureRefundAccess(req, payment);
    } catch (error) {
      return respond(res, 404, false, "Payment not found");
    }

    const refunds = await Refund.find({
      payment: paymentId,
    }).sort("-createdAt");

    const totalRefunded = refunds
      .filter((refund) => refund.status === "completed")
      .reduce((sum, refund) => sum + refund.amount, 0);

    return respond(
      res,
      200,
      true,
      "Refunds fetched successfully",
      {
        refunds,
        totalRefunded,
      }
    );
  } catch (error) {
    console.error("getRefundsByPayment error:", error);

    return respond(
      res,
      500,
      false,
      "Unable to fetch refunds"
    );
  }
};
/**
 * @desc    Update a refund (whitelisted fields, non-status)
 * @route   PUT /api/refunds/:id
 * @access  Private/Admin
 */
export const updateRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid refund id");
    }

    const allowed = [
      "providerRefundId",
      "reason",
      "note",
      "providerResponse",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.reason && !VALID_REASONS.includes(updates.reason)) {
      return respond(res, 400, false, "Invalid refund reason");
    }

    const refund = await Refund.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!refund) return respond(res, 404, false, "Refund not found");

    return respond(res, 200, true, "Refund updated successfully", refund);
  } catch (error) {
    console.error("updateRefund error:", error);
    return respond(res, 500, false, error.message);
  }
};

/**
 * @desc    Delete a refund (only pending/failed — never completed)
 * @route   DELETE /api/refunds/:id
 * @access  Private/Admin
 */
export const deleteRefund = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid refund id");
    }

    let refund;

    await session.withTransaction(async () => {
      refund = await Refund.findById(id).session(session);
      if (!refund) throw Object.assign(new Error("Refund not found"), { status: 404 });

      if (refund.status === "completed") {
        throw Object.assign(
          new Error("Cannot delete a completed refund (financial record)"),
          { status: 400 }
        );
      }

      // If pending, rollback the refundedAmount on the payment
      if (refund.status === "pending") {
        const payment = await Payment.findById(refund.payment).session(session);
        if (payment) {
          payment.refundedAmount = Math.max(
            0,
            (payment.refundedAmount || 0) - refund.amount
          );

          if (payment.refundedAmount <= 0) payment.status = "completed";
          else if (payment.refundedAmount < payment.amount)
            payment.status = "partially_refunded";
          else payment.status = "refunded";

          await payment.save({ session });
        }
      }

      await Refund.findByIdAndDelete(id).session(session);
    });

    return respond(res, 200, true, "Refund deleted successfully", { id });
  } catch (error) {
    console.error("deleteRefund error:", error);
    return respond(res, error.status || 500, false, error.message);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get refund stats (dashboard)
 * @route   GET /api/refunds/stats
 * @access  Private/Admin
 */
export const getRefundStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [byStatus, byReason] = await Promise.all([
      Refund.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
      Refund.aggregate([
        { $match: { ...match, status: "completed" } },
        {
          $group: {
            _id: "$reason",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totals = byStatus.reduce(
      (acc, s) => {
        acc.count += s.count;
        acc.totalAmount += s.totalAmount;
        if (s._id === "completed") acc.completedAmount = s.totalAmount;
        return acc;
      },
      { count: 0, totalAmount: 0, completedAmount: 0 }
    );

    return respond(res, 200, true, "Refund stats fetched", {
      byStatus,
      byReason,
      totals,
    });
  } catch (error) {
    console.error("getRefundStats error:", error);
    return respond(res, 500, false, error.message);
  }
};