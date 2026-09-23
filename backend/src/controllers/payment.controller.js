// controllers/payment.controller.js
import Payment from "../models/Payment.js";
import Appointment from "../models/Appointment.js";
import mongoose from "mongoose";
import { createPaypalOrder, capturePaypalOrder } from "../services/paypal.service.js";
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
 * - PayPal order is created server-side using ONLY server-derived data.
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
    const appointment = await Appointment.findById(appointmentId)
      .populate("service")
      .populate("customer", "email");

    if (!appointment) {
      return respond(res, 404, false, "Appointment not found");
    }

    if (appointment.paymentMethod !== "online") {
      return respond(
        res,
        409,
        false,
        "This appointment was booked for payment at the shop"
      );
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
    // 8. Payment type is server-controlled.
    // ------------------------------------------------------------
    const type = "full_payment";

    // ------------------------------------------------------------
    // 9. Prevent another active payment for this appointment
    //
    // IMPORTANT:
    // Check this BEFORE creating a PayPal order.
    // Otherwise a retry could create multiple PayPal orders.
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
    // 10. Create PayPal order using ONLY server-derived data.
    //
    // The client never supplies:
    // - amount
    // - currency
    // - reference ID
    // - PayPal order ID
    // ------------------------------------------------------------
    let paypalOrder;

    try {
      paypalOrder = await createPaypalOrder({
        amount,
        currency: "USD",
        referenceId: appointment._id.toString(),
      });
    } catch (error) {
      console.error("PayPal order creation failed:", error);

      return respond(
        res,
        502,
        false,
        "Unable to initialize PayPal payment"
      );
    }

    const paypalOrderId = paypalOrder?.id;

    if (!paypalOrderId) {
      console.error(
        "PayPal order creation returned no order ID:",
        paypalOrder
      );

      return respond(
        res,
        502,
        false,
        "PayPal did not return a valid order ID"
      );
    }

    // ------------------------------------------------------------
    // 11. Create our internal payment record.
    //
    // providerOrderId comes ONLY from PayPal.
    // ------------------------------------------------------------
    const payment = await Payment.create({
      appointment: appointment._id,

      // Payment.customer references the authenticated User.
      customer: req.user.mongoId,

      // Barber comes from the appointment.
      barber: appointment.barber,

      // Provider is server-controlled.
      provider: "paypal",

      // Trusted PayPal-generated order ID.
      providerOrderId: paypalOrderId,

      // Amount comes from the appointment snapshot.
      amount,

      currency: "USD",

      type,

      // Payment starts pending until server-side capture verification.
      status: "pending",

      refundedAmount: 0,

      metadata: {},
    });

    // ------------------------------------------------------------
    // 12. Return BOTH our payment and the PayPal order ID.
    //
    // Frontend needs paypalOrderId to render PayPalButtons.
    // ------------------------------------------------------------
    return respond(
      res,
      201,
      true,
      "Payment created successfully",
      {
        payment,
        paypalOrderId,
      }
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

// ---------------------------------------------------------------------------
// Capture a PayPal payment after the order has been approved on the client side.
// ---------------------------------------------------------------------------
export const capturePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId } = req.body;

    // Validate payment id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid payment id");
    }

    // Validate orderId in body
    if (!orderId || typeof orderId !== "string") {
      return respond(res, 400, false, "orderId is required");
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    // Ensure the authenticated user owns the payment (or is admin/owner)
    try {
      ensurePaymentAccess(req, payment);
    } catch (error) {
      return respond(res, error.status || 404, false, error.message);
    }

    // Verify provider is PayPal
    if (payment.provider !== "paypal") {
      return respond(res, 400, false, "Payment provider is not PayPal");
    }

    // Idempotent: if already completed, return the payment unchanged
    if (payment.status === "completed") {
      return respond(res, 200, true, "Payment already captured", payment);
    }

    // Verify orderId matches the stored providerOrderId
    if (payment.providerOrderId !== orderId) {
      return respond(res, 400, false, "orderId does not match payment's providerOrderId");
    }

    // Only allow capture from pending or authorized states
    if (!["pending", "authorized"].includes(payment.status)) {
      return respond(res, 409, false, `Cannot capture payment in status ${payment.status}`);
    }

    // Validate state transition
    try {
      assertPaymentTransition(payment.status, "completed");
    } catch (e) {
      return respond(res, 409, false, e.message);
    }

    // Perform PayPal capture
    let captureResponse;
    try {
      captureResponse = await capturePaypalOrder(payment.providerOrderId);
    } catch (e) {
      console.error("capturePaypalOrder error:", e);
      return respond(res, 502, false, "Failed to capture payment with PayPal");
    }

    // Basic sanity checks on PayPal response
    if (!captureResponse || captureResponse.id !== payment.providerOrderId) {
      console.error("PayPal capture order ID mismatch", captureResponse);
      return respond(res, 502, false, "PayPal capture response order ID mismatch");
    }

    const purchaseUnit = (captureResponse.purchase_units && captureResponse.purchase_units[0]) || {};
    const captures = purchaseUnit.payments && purchaseUnit.payments.captures;
    const captureInfo = Array.isArray(captures) ? captures[0] : null;

    if (!captureInfo || captureInfo.status !== "COMPLETED") {
      console.error("PayPal capture not completed", captureInfo);
      return respond(res, 502, false, "PayPal capture not completed");
    }

    const capturedAmount = captureInfo.amount?.value;
    const capturedCurrency = captureInfo.amount?.currency_code;
    if (Number(capturedAmount) !== Number(payment.amount) || capturedCurrency !== payment.currency) {
      console.error("Capture amount/currency mismatch", capturedAmount, capturedCurrency);
      return respond(res, 502, false, "Captured amount or currency does not match payment");
    }

    // Persist PayPal capture details and transition payment state
    payment.providerCaptureId = captureInfo.id;
    payment.status = "completed";
    await payment.save();

    // Update related appointment payment status, if linked
    if (payment.appointment) {
      try {
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
          appointment.paymentStatus = "paid";
          await appointment.save();
        }
      } catch (e) {
        console.error("Failed to update appointment paymentStatus:", e);
        // Non‑critical – continue
      }
    }

    return respond(res, 200, true, "Payment captured successfully", payment);
  } catch (error) {
    console.error("capturePayment error:", error);
    return respond(res, 500, false, "Unable to capture payment");
  }
};

// ---------------------------------------------------------------------------
// Capture a PayPal payment after the order has been approved on the client side.
// ---------------------------------------------------------------------------
const capturePaymentDuplicate = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId } = req.body;

    // Validate payment id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid payment id");
    }

    // Validate orderId in body
    if (!orderId || typeof orderId !== "string") {
      return respond(res, 400, false, "orderId is required");
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    // Ensure the authenticated user owns the payment (or is admin/owner)
    try {
      ensurePaymentAccess(req, payment);
    } catch (error) {
      return respond(res, error.status || 404, false, error.message);
    }

    // Verify provider is PayPal
    if (payment.provider !== "paypal") {
      return respond(res, 400, false, "Payment provider is not PayPal");
    }

    // Idempotent: if already completed, return the payment unchanged
    if (payment.status === "completed") {
      return respond(res, 200, true, "Payment already captured", payment);
    }

    // Verify orderId matches the stored providerOrderId
    if (payment.providerOrderId !== orderId) {
      return respond(res, 400, false, "orderId does not match payment's providerOrderId");
    }

    // Only allow capture from pending or authorized states
    if (!["pending", "authorized"].includes(payment.status)) {
      return respond(res, 409, false, `Cannot capture payment in status ${payment.status}`);
    }

    // Validate state transition
    try {
      assertPaymentTransition(payment.status, "completed");
    } catch (e) {
      return respond(res, 409, false, e.message);
    }

    // Perform PayPal capture
    let captureResponse;
    try {
      captureResponse = await capturePaypalOrder(payment.providerOrderId);
    } catch (e) {
      console.error("capturePaypalOrder error:", e);
      return respond(res, 502, false, "Failed to capture payment with PayPal");
    }

    // Basic sanity checks on PayPal response
    if (!captureResponse || captureResponse.id !== payment.providerOrderId) {
      console.error("PayPal capture order ID mismatch", captureResponse);
      return respond(res, 502, false, "PayPal capture response order ID mismatch");
    }

    const purchaseUnit = (captureResponse.purchase_units && captureResponse.purchase_units[0]) || {};
    const captures = purchaseUnit.payments && purchaseUnit.payments.captures;
    const captureInfo = Array.isArray(captures) ? captures[0] : null;

    if (!captureInfo || captureInfo.status !== "COMPLETED") {
      console.error("PayPal capture not completed", captureInfo);
      return respond(res, 502, false, "PayPal capture not completed");
    }

    const capturedAmount = captureInfo.amount?.value;
    const capturedCurrency = captureInfo.amount?.currency_code;
    if (Number(capturedAmount) !== Number(payment.amount) || capturedCurrency !== payment.currency) {
      console.error("Capture amount/currency mismatch", capturedAmount, capturedCurrency);
      return respond(res, 502, false, "Captured amount or currency does not match payment");
    }

    // Persist PayPal capture details and transition payment state
    payment.providerCaptureId = captureInfo.id;
    payment.status = "completed";
    await payment.save();

    // Update related appointment payment status, if linked
    if (payment.appointment) {
      try {
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
          appointment.paymentStatus = "paid";
          await appointment.save();
        }
      } catch (e) {
        console.error("Failed to update appointment paymentStatus:", e);
        // Non‑critical – continue
      }
    }

    return respond(res, 200, true, "Payment captured successfully", payment);
  } catch (error) {
    console.error("capturePayment error:", error);
    return respond(res, 500, false, "Unable to capture payment");
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
 * @desc    Update payment status through the controlled state machine
 * @route   PATCH /api/admin/payments/:id/status
 * @access  Private/Admin
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, failureReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid payment id");
    }

    if (!status || !PAYMENT_STATUSES.includes(status)) {
      return respond(res, 400, false, "Invalid payment status");
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    // ------------------------------------------------------------
    // P0.3 — Enforce the payment state machine.
    //
    // This prevents arbitrary status changes such as:
    // completed -> pending
    // refunded -> completed
    // failed -> completed
    // ------------------------------------------------------------
    try {
      assertPaymentTransition(payment.status, status);
    } catch (error) {
      return respond(
        res,
        409,
        false,
        error.message || "Invalid payment status transition"
      );
    }

    // ------------------------------------------------------------
    // Failure reason is only meaningful for failed payments.
    // ------------------------------------------------------------
    if (status === "failed" && failureReason !== undefined) {
      payment.failureReason = failureReason;
    }

    payment.status = status;

    await payment.save();

    return respond(
      res,
      200,
      true,
      "Payment status updated successfully",
      payment
    );
  } catch (error) {
    console.error("updatePaymentStatus error:", error);

    return respond(
      res,
      500,
      false,
      "Unable to update payment status"
    );
  }
};

/**
 * @desc    Process a refund (full or partial)
 * @route   POST /api/payments/:id/refund
 * @access  Private/Admin
 */
/**
 * @desc    Process a refund
 * @route   POST /api/payments/:id/refund
 * @access  Private/Admin
 *
 * P0.6:
 * Refund lifecycle is owned by refund.controller.js.
 *
 * Do not maintain a second refund implementation here.
 */
export const refundPayment = async (req, res) => {
  return respond(
    res,
    409,
    false,
    "Use the refund lifecycle endpoint to process refunds"
  );
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

    const payment = await Payment.findById(id);
    if (!payment) {
      return respond(res, 404, false, "Payment not found");
    }

    // P0.12: Financial record deletion protection
    if (["completed", "refunded", "partially_refunded", "authorized"].includes(payment.status)) {
      return respond(res, 409, false, "Cannot delete financial records that have been authorized, completed, or refunded.");
    }

    await Payment.findByIdAndDelete(id);

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