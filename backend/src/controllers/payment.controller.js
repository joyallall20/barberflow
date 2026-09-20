// controllers/payment.controller.js
import Payment from "../models/Payment.js";
import Appointment from "../models/Appointment.js";
import mongoose from "mongoose";
import {
  PAYMENT_STATUSES,
  assertPaymentTransition,
} from "../utils/paymentState.js";

/**
 * Helper: standard API response
 */
const isAdminOrOwner = (req) =>
  req.user?.role === "admin" || req.user?.role === "owner";

const ensurePaymentAccess = (req, payment) => {
  // Admin/owner access is already authenticated by the admin router.
  if (isAdminOrOwner(req)) {
    return;
  }

  // Payment.customer references the authenticated User document.
  if (
    !req.user?.mongoId ||
    !payment.customer ||
    payment.customer.toString() !== req.user.mongoId.toString()
  ) {
    throw Object.assign(new Error("Payment not found"), {
      status: 404,
    });
  }
};

const respond = (res, status, success, message, data = null) =>
  res.status(status).json({ success, message, ...(data && { data }) });

/**
 * @desc    Create a new payment record
 * @route   POST /api/payments
 * @access  Private
 */
/**
 * @desc    Create a new payment record securely
 * @route   POST /api/payments
 * @access  Private
 */
/**
 * @desc    Create a new payment record
 * @route   POST /api/payments
 * @access  Private
 *
 * SECURITY:
 * - Client provides only the appointment ID.
 * - Customer identity comes from authenticated Firebase/Mongo user.
 * - Appointment ownership is verified server-side using the customer's
 *   normalized email.
 * - Payment amount comes from the appointment's server-side price snapshot.
 * - Payment customer/barber/appointment are server-derived.
 * - Payment status starts as pending.
 * - Provider is server-controlled.
 * - Provider IDs are NOT accepted from the client.
 * - Deposit pricing is NOT invented here.
 */
export const createPayment = async (req, res) => {
  try {
    const { appointment: appointmentId } = req.body;

    // ------------------------------------------------------------
    // 1. Authentication must resolve to a real MongoDB User
    // ------------------------------------------------------------
    if (!req.user || req.user.needsSync || !req.user.mongoId) {
      return respond(
        res,
        403,
        false,
        "A synchronized customer account is required to create a payment"
      );
    }

    // ------------------------------------------------------------
    // 2. Validate appointment reference
    // ------------------------------------------------------------
    if (!appointmentId) {
      return respond(res, 400, false, "Appointment ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return respond(res, 400, false, "Invalid appointment id");
    }

    // ------------------------------------------------------------
    // 3. Load appointment + service from the database
    // ------------------------------------------------------------
    const appointment = await Appointment.findById(appointmentId).populate(
      "service"
    );

    if (!appointment) {
      return respond(res, 404, false, "Appointment not found");
    }

    // ------------------------------------------------------------
    // 4. Verify appointment ownership
    //
    // Appointment.customer is a Customer document.
    // Authenticated identity is a User document.
    //
    // Customer currently has no User ObjectId reference in its schema,
    // so use the existing normalized email identity.
    // ------------------------------------------------------------
    const authenticatedEmail = req.user.email?.trim().toLowerCase();
    const appointmentCustomerEmail = appointment.customer?.email
      ? appointment.customer.email.trim().toLowerCase()
      : null;

    if (
      !authenticatedEmail ||
      !appointmentCustomerEmail ||
      authenticatedEmail !== appointmentCustomerEmail
    ) {
      return respond(
        res,
        403,
        false,
        "Not authorized to pay for this appointment"
      );
    }

    // ------------------------------------------------------------
    // 5. Appointment must actually be payable
    // ------------------------------------------------------------
    if (appointment.status === "cancelled") {
      return respond(
        res,
        409,
        false,
        "Cancelled appointments cannot be paid"
      );
    }

    if (appointment.status === "completed") {
      return respond(
        res,
        409,
        false,
        "Completed appointments cannot start a new payment"
      );
    }

    if (appointment.paymentStatus === "paid") {
      return respond(
        res,
        409,
        false,
        "This appointment has already been fully paid"
      );
    }

    if (appointment.paymentStatus === "refunded") {
      return respond(
        res,
        409,
        false,
        "A refunded appointment cannot start a new payment"
      );
    }

    // ------------------------------------------------------------
    // 6. Verify the service exists
    // ------------------------------------------------------------
    if (!appointment.service) {
      return respond(
        res,
        500,
        false,
        "Service pricing is not configured for this appointment"
      );
    }

    // ------------------------------------------------------------
    // 7. Use the appointment's server-side price snapshot
    //
    // Appointment.price is the booking-time price and is therefore
    // the correct financial source for this payment record.
    //
    // Do NOT accept amount from req.body.
    // ------------------------------------------------------------
    const amount = Number(appointment.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return respond(
        res,
        500,
        false,
        "Appointment has an invalid payment amount"
      );
    }

    // ------------------------------------------------------------
    // 8. Payment type is currently server-controlled.
    //
    // No deposit percentage is defined by the existing backend
    // architecture, so we must not invent one here.
    //
    // P0.1 therefore creates a full_payment record only.
    // Deposit support should be implemented separately once the
    // application's actual deposit business rule is established.
    // ------------------------------------------------------------
    const type = "full_payment";

    // ------------------------------------------------------------
    // 9. Prevent another active payment for this appointment
    //
    // This is not the final race/idempotency solution.
    // P0.8/P0.11 will add stronger database-level protection.
    // ------------------------------------------------------------
    const existingPayment = await Payment.findOne({
      appointment: appointment._id,
      status: {
        $in: ["pending", "authorized", "completed", "partially_refunded"],
      },
    });

    if (existingPayment) {
      return respond(
        res,
        409,
        false,
        "An active payment already exists for this appointment"
      );
    }

    // ------------------------------------------------------------
    // 10. Create payment using ONLY server-derived financial data
    // ------------------------------------------------------------
    const payment = await Payment.create({
      appointment: appointment._id,

      // Payment.customer references User, not Customer.
      customer: req.user.mongoId,

      // Barber comes from the appointment.
      barber: appointment.barber,

      // Provider is server-controlled.
      provider: "paypal",

      // Provider IDs are intentionally NOT accepted from the client.
      // They will be associated only through trusted PayPal flow.

      amount,
      currency: "USD",
      type,

      // Initial state is server-controlled.
      status: "pending",

      // Never accept refundedAmount from the client.
      refundedAmount: 0,

      // Never accept arbitrary financial metadata from the client.
      metadata: {},
    });

    return respond(
      res,
      201,
      true,
      "Payment created successfully",
      payment
    );
  } catch (error) {
    console.error("createPayment error:", error);

    return respond(
      res,
      500,
      false,
      "Unable to create payment"
    );
  }
};
/**
 * @desc    Get all payments (with filters, pagination, sorting)
 * @route   GET /api/payments
 * @access  Private/Admin
 */
export const getPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      provider,
      type,
      customer,
      barber,
      appointment,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (provider) filter.provider = provider;
    if (type) filter.type = type;
    if (customer) filter.customer = customer;
    if (barber) filter.barber = barber;
    if (appointment) filter.appointment = appointment;

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

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("appointment", "date time status")
        .populate("customer", "name email")
        .populate("barber", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(filter),
    ]);

    return respond(res, 200, true, "Payments fetched successfully", {
      payments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getPayments error:", error);
    return respond(res, 500, false, error.message);
  }
};

/**
 * @desc    Get a single payment by ID
 * @route   GET /api/payments/:id
 * @access  Private
 */
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid payment id");
    }

    const payment = await Payment.findById(id)
      .populate("appointment")
      .populate("customer", "name email")
      .populate("barber", "name email");

    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    try {
      ensurePaymentAccess(req, payment);
    } catch (error) {
      return respond(res, error.status || 404, false, "Payment not found");
    }

    return respond(
      res,
      200,
      true,
      "Payment fetched successfully",
      payment
    );
  } catch (error) {
    console.error("getPaymentById error:", error);

    return respond(
      res,
      500,
      false,
      "Unable to fetch payment"
    );
  }
};

/**
 * @desc    Get payment by PayPal order id
 * @route   GET /api/payments/order/:orderId
 * @access  Private
 */
export const getPaymentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== "string") {
      return respond(res, 400, false, "Invalid payment order id");
    }

    const payment = await Payment.findOne({
      providerOrderId: orderId,
    });

    if (!payment) {
      return respond(
        res,
        404,
        false,
        "Payment not found for this order id"
      );
    }

    try {
      ensurePaymentAccess(req, payment);
    } catch (error) {
      return respond(
        res,
        error.status || 404,
        false,
        "Payment not found for this order id"
      );
    }

    return respond(
      res,
      200,
      true,
      "Payment fetched successfully",
      payment
    );
  } catch (error) {
    console.error("getPaymentByOrderId error:", error);

    return respond(
      res,
      500,
      false,
      "Unable to fetch payment"
    );
  }
};

/**
 * @desc    Update a payment (generic fields)
 * @route   PUT /api/payments/:id
 * @access  Private/Admin
 */
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid payment id");
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    const updates = {};

    if (req.body.failureReason !== undefined) {
      if (payment.status !== "failed") {
        return respond(
          res,
          409,
          false,
          "failureReason can only be updated for failed payments"
        );
      }

      updates.failureReason = req.body.failureReason;
    }

    if (Object.keys(updates).length === 0) {
      return respond(
        res,
        400,
        false,
        "No permitted payment fields were provided"
      );
    }

    Object.assign(payment, updates);

    await payment.save();

    return respond(
      res,
      200,
      true,
      "Payment updated successfully",
      payment
    );
  } catch (error) {
    console.error("updatePayment error:", error);

    return respond(
      res,
      500,
      false,
      "Unable to update payment"
    );
  }
};

/**
 * @desc    Process a refund (full or partial)
 * @route   POST /api/payments/:id/refund
 * @access  Private/Admin
 */
export const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // optional, defaults to full remaining

    const payment = await Payment.findById(id);
    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    if (payment.status !== "completed" && payment.status !== "partially_refunded") {
      return respond(res, 400, false, "Only completed payments can be refunded");
    }

    const remaining = payment.amount - payment.refundedAmount;
    const refundAmount = amount !== undefined ? Number(amount) : remaining;

    if (refundAmount <= 0 || refundAmount > remaining) {
      return respond(
        res,
        400,
        false,
        `Refund amount must be between 0 and ${remaining}`
      );
    }

    // NOTE: integrate with PayPal refund API here.
    // const refundResult = await paypal.refundCapture(payment.providerCaptureId, refundAmount);

    payment.refundedAmount += refundAmount;
    payment.status =
      payment.refundedAmount >= payment.amount ? "refunded" : "partially_refunded";

    await payment.save();

    return respond(res, 200, true, "Refund processed successfully", payment);
  } catch (error) {
    console.error("refundPayment error:", error);
    return respond(res, 500, false, error.message);
  }
};

/**
 * @desc    Delete a payment
 * @route   DELETE /api/payments/:id
 * @access  Private/Admin
 */
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid payment id");
    }

    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    return respond(res, 200, true, "Payment deleted successfully", { id });
  } catch (error) {
    console.error("deletePayment error:", error);
    return respond(res, 500, false, error.message);
  }
};

/**
 * @desc    Get payment stats (dashboard)
 * @route   GET /api/payments/stats
 * @access  Private/Admin
 */
export const getPaymentStats = async (req, res) => {
  try {
    const { barber, startDate, endDate } = req.query;

    const match = {};
    if (barber) match.barber = new mongoose.Types.ObjectId(barber);
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const stats = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalRefunded: { $sum: "$refundedAmount" },
        },
      },
    ]);

    const totals = stats.reduce(
      (acc, s) => {
        acc.count += s.count;
        acc.totalAmount += s.totalAmount;
        acc.totalRefunded += s.totalRefunded;
        return acc;
      },
      { count: 0, totalAmount: 0, totalRefunded: 0 }
    );

    return respond(res, 200, true, "Payment stats fetched", {
      byStatus: stats,
      totals,
      netRevenue: totals.totalAmount - totals.totalRefunded,
    });
  } catch (error) {
    console.error("getPaymentStats error:", error);
    return respond(res, 500, false, error.message);
  }
};