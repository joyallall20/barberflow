// controllers/refund.controller.js
import mongoose from "mongoose";
import Refund from "../models/Refund.js";
import Payment from "../models/Payment.js";
import Appointment from "../models/Appointment.js";
import { refundPaypalCapture } from "../services/paypal.service.js";

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
/**
 * @desc    Create and process a refund
 * @route   POST /api/refunds
 * @access  Private/Admin
 *
 * P0.6:
 * - Create refund as pending.
 * - Never update Payment before PayPal confirms the refund.
 * - Never call PayPal inside a MongoDB transaction.
 * - Payment financial totals are updated only after provider success.
 */
export const createRefund = async (req, res) => {

  if (!isAdminOrOwner(req)) {
  return respond(
    res,
    403,
    false,
    "Only an admin or owner can initiate a refund"
  );
}

  let refundId;

  try {
    const {
      payment: paymentId,
      amount,
      reason = "other",
      note,
    } = req.body;

    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return respond(res, 400, false, "Valid payment id is required");
    }

    if (amount === undefined || amount === null) {
      return respond(res, 400, false, "A valid refund amount is required");
    }

    const refundAmount = Number(amount);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return respond(res, 400, false, "A valid refund amount is required");
    }

    if (!VALID_REASONS.includes(reason)) {
      return respond(res, 400, false, "Invalid refund reason");
    }

    // ------------------------------------------------------------
    // STEP 1 — Read payment and validate refund eligibility.
    // ------------------------------------------------------------
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    if (!["completed", "partially_refunded"].includes(payment.status)) {
      return respond(
        res,
        400,
        false,
        `Cannot refund a payment with status "${payment.status}"`
      );
    }

    if (!payment.providerCaptureId) {
      return respond(
        res,
        409,
        false,
        "Payment does not have a verified PayPal capture"
      );
    }

    const remaining =
      Number(payment.amount) - Number(payment.refundedAmount || 0);

    if (refundAmount > remaining) {
      return respond(
        res,
        400,
        false,
        `Refund amount exceeds remaining refundable balance (${remaining})`
      );
    }

    // ------------------------------------------------------------
    // STEP 2 — Create ONLY a pending financial record.
    //
    // IMPORTANT:
    // Do NOT update Payment here.
    // The refund has not happened at PayPal yet.
    // ------------------------------------------------------------
    const refund = await Refund.create({
      payment: payment._id,
      appointment: payment.appointment,
      provider: payment.provider,
      amount: refundAmount,
      currency: payment.currency,
      reason,
      status: "pending",
      initiatedBy: req.user?.mongoId || null,
      note,
    });

    refundId = refund._id;

    // ------------------------------------------------------------
    // STEP 3 — Call PayPal OUTSIDE a MongoDB transaction.
    // ------------------------------------------------------------
    let providerResult;

    try {
      providerResult = await refundPaypalCapture(
        payment.providerCaptureId,
        refundAmount,
        payment.currency
      );
    } catch (providerError) {
      console.error("PayPal refund failed:", providerError);

      refund.status = "failed";
      refund.providerResponse = {
        error: providerError.message,
      };

      await refund.save();

      return respond(
        res,
        502,
        false,
        "PayPal refund failed. No payment balance was changed."
      );
    }

    // ------------------------------------------------------------
    // STEP 4 — Provider must explicitly confirm completion.
    // ------------------------------------------------------------
    const providerRefundId = providerResult?.id;
    const providerStatus = providerResult?.status;

    if (!providerRefundId || providerStatus !== "COMPLETED") {
      refund.status = "failed";
      refund.providerResponse = providerResult || null;

      await refund.save();

      return respond(
        res,
        502,
        false,
        "PayPal did not confirm the refund as completed."
      );
    }

    // ------------------------------------------------------------
    // STEP 5 — Provider succeeded.
    //
    // Now update Refund + Payment atomically.
    // ------------------------------------------------------------
    const session = await mongoose.startSession();

    try {
      let completedRefund;

      await session.withTransaction(async () => {
        const currentRefund = await Refund.findById(refundId).session(session);

        if (!currentRefund) {
          throw Object.assign(
            new Error("Refund record disappeared before completion"),
            { status: 500 }
          );
        }

        if (currentRefund.status !== "pending") {
          throw Object.assign(
            new Error("Refund is no longer pending"),
            { status: 409 }
          );
        }

        const currentPayment = await Payment.findById(
          currentRefund.payment
        ).session(session);

        if (!currentPayment) {
          throw Object.assign(
            new Error("Payment not found while completing refund"),
            { status: 404 }
          );
        }

        const currentRefundedAmount = Number(
          currentPayment.refundedAmount || 0
        );

        const newRefundedAmount =
          currentRefundedAmount + Number(currentRefund.amount);

        if (newRefundedAmount > Number(currentPayment.amount)) {
          throw Object.assign(
            new Error("Refund would exceed payment amount"),
            { status: 409 }
          );
        }

        currentRefund.status = "completed";
        currentRefund.providerRefundId = providerRefundId;
        currentRefund.providerResponse = providerResult;

        await currentRefund.save({ session });

        currentPayment.refundedAmount = newRefundedAmount;

        currentPayment.status =
          newRefundedAmount >= Number(currentPayment.amount)
            ? "refunded"
            : "partially_refunded";

        await currentPayment.save({ session });

        if (currentPayment.status === "refunded") {
          await Appointment.findByIdAndUpdate(
            currentPayment.appointment,
            { paymentStatus: "refunded" },
            { session }
          );
        }

        completedRefund = currentRefund;
      });

      return respond(
        res,
        201,
        true,
        "Refund processed successfully",
        completedRefund
      );
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("createRefund error:", error);

    // If an unexpected DB error occurs after the refund record was created,
    // do not pretend the provider refund failed. The provider may already
    // have processed it. P0.9/P0.11 will add stronger reconciliation.
    return respond(
      res,
      error.status || 500,
      false,
      error.message || "Unable to process refund"
    );
  }
};
/**
 * @desc    Mark a refund as completed (after PayPal confirm)
 * @route   PATCH /api/refunds/:id/complete
 * @access  Private/Admin
 */

/**
 * @desc    Manually complete a refund
 * @route   PATCH /api/refunds/:id/complete
 * @access  Private/Admin
 *
 * P0.6:
 * Refund completion is provider-controlled.
 * This endpoint must NOT allow a client to manufacture
 * a completed refund by submitting a providerRefundId.
 *
 * PayPal completion is handled by the provider-processing flow.
 */
export const completeRefund = async (req, res) => {
  return respond(
    res,
    409,
    false,
    "Refund completion is controlled by the payment provider"
  );
};
/**
 * @desc    Mark a pending refund as failed
 * @route   PATCH /api/refunds/:id/fail
 * @access  Private/Admin
 *
 * P0.6:
 * A failed pending refund must NOT modify Payment.refundedAmount
 * because pending refunds are not included in financial totals.
 */
export const failRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { providerResponse, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid refund id");
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return respond(res, 404, false, "Refund not found");
    }

    if (refund.status === "completed") {
      return respond(
        res,
        409,
        false,
        "Cannot fail a completed refund"
      );
    }

    if (refund.status === "failed") {
      return respond(
        res,
        409,
        false,
        "Refund is already marked as failed"
      );
    }

    refund.status = "failed";

    if (providerResponse !== undefined) {
      refund.providerResponse = providerResponse;
    }

    if (note !== undefined) {
      refund.note = note;
    }

    await refund.save();

    return respond(
      res,
      200,
      true,
      "Refund marked as failed",
      refund
    );
  } catch (error) {
    console.error("failRefund error:", error);

    return respond(
      res,
      error.status || 500,
      false,
      error.message || "Unable to mark refund as failed"
    );
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
      "reason",
      "note",
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
/**
 * @desc    Delete a refund
 * @route   DELETE /api/refunds/:id
 * @access  Private/Admin
 *
 * Completed refunds are immutable financial history.
 * Pending/failed records may be deleted for now.
 *
 * P0.12 will harden financial record deletion further.
 */
export const deleteRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid refund id");
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return respond(res, 404, false, "Refund not found");
    }

    if (refund.status === "completed" || refund.status === "failed") {
      return respond(
        res,
        409,
        false,
        "Cannot delete a completed or failed refund (financial record history must be preserved)"
      );
    }

    await Refund.findByIdAndDelete(id);

    return respond(
      res,
      200,
      true,
      "Refund deleted successfully",
      { id }
    );
  } catch (error) {
    console.error("deleteRefund error:", error);

    return respond(
      res,
      error.status || 500,
      false,
      error.message || "Unable to delete refund"
    );
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