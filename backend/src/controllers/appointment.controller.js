// controllers/appointment.controller.js
import mongoose from "mongoose";
import { z } from "zod";

import Appointment from "../models/Appointment.js";
import Customer from "../models/Customer.js";
import BookingLock from "../models/BookingLock.js";
import Payment from "../models/Payment.js";
import Refund from "../models/Refund.js";

import {
  TIME_REGEX,
  addDaysUTC,
} from "../utils/time.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import { parseDateOnly } from "../utils/time.js";

import { validateBookingSlot } from "../services/availability.service.js";
import { findOrCreateCustomer } from "../services/customer.service.js";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const isAdminOrOwner = (req) =>
  req.user?.role === "admin" || req.user?.role === "owner";

const isBarberUser = (req) => req.user?.role === "barber";

const ensureAdminOrAssignedBarber = (req, appointment) => {
  if (isAdminOrOwner(req)) {
    return "admin";
  }

  if (isBarberUser(req)) {
    if (
      !req.user?.barberId ||
      String(req.user.barberId) !== String(appointment.barber)
    ) {
      throw new ApiError(
        403,
        "You are not authorized to cancel this appointment"
      );
    }

    return "barber";
  }

  throw new ApiError(
    403,
    "Only the assigned barber or an admin can perform this cancellation"
  );
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

// Payment statuses mirrored from the Appointment schema.
const PAYMENT_STATUSES = ["unpaid", "deposit_paid", "paid", "refunded"];

const POPULATE_PATHS = [
  { path: "customer", select: "name email phone" },
  { path: "barber", select: "name photo" },
  { path: "service", select: "name price duration" },
];

// Statuses from which payment is required before completion.
const PAYABLE_PAYMENT_STATUSES = ["paid", "deposit_paid"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ensureObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

const ensureStatus = (appointment, allowed, action) => {
  if (!allowed.includes(appointment.status)) {
    throw new ApiError(
      409,
      `Cannot ${action} an appointment with status "${appointment.status}"`
    );
  }
};

const loadAppointment = async (id) => {
  ensureObjectId(id, "appointment ID");
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new ApiError(404, "Appointment not found");
  return appointment;
};

/**
 * Attach the latest "live" payment to an appointment response.
 * Used to give the frontend the appointment + its payment in one call.
 */
const attachPayment = async (appointment) => {
  const payment = await Payment.findOne({
    appointment: appointment._id,
    status: {
      $in: ["authorized", "completed", "partially_refunded", "refunded"],
    },
  }).sort("-createdAt");

  return {
    ...appointment.toObject(),
    payment: payment || null,
  };
};

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const createAppointmentSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Valid email is required").max(200),
  phone: z.string().trim().min(7, "Phone is required").max(30),
  barber: z.string().regex(OBJECT_ID_REGEX, "Invalid barber ID"),
  service: z.string().regex(OBJECT_ID_REGEX, "Invalid service ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  startTime: z.string().regex(TIME_REGEX, "startTime must be HH:MM"),

  paymentMethod: z.enum(["online", "pay_at_shop"]),

  notes: z.string().trim().max(1000).optional().default(""),
});

const listQuerySchema = z.object({
  barber: z.string().regex(OBJECT_ID_REGEX).optional(),
  customer: z.string().regex(OBJECT_ID_REGEX).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(), // <— NEW
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// paymentStatus is intentionally NOT writable here — only the Payment /
// Refund controllers and the PayPal webhook may mutate it, preserving
// a clean audit trail. Internal flags (reminderSent, reviewRequestSent,
// rebookingReminderSent) remain non-writable.
const updateAppointmentSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
    cancellationReason: z.string().trim().max(500).optional(),
  })
  .strict();

const cancelSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default(""),
});


const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  startTime: z.string().regex(TIME_REGEX, "startTime must be HH:MM"),
});

/* ------------------------------------------------------------------ */
/* Controllers                                                         */
/* ------------------------------------------------------------------ */

export const createAppointment = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(createAppointmentSchema, req.body);

  const bookingPreview = await validateBookingSlot({
    barberId: payload.barber,
    serviceId: payload.service,
    date: payload.date,
    startTime: payload.startTime,
  });

  const customer = await findOrCreateCustomer({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    preferredBarber: bookingPreview.barber._id,
    preferredService: bookingPreview.service._id,
    notes: payload.notes,
  });

  const session = await mongoose.startSession();

  try {
    let appointment;

    await session.withTransaction(async () => {
      const lockId = `${String(bookingPreview.barber._id)}_${payload.date}`;

      await BookingLock.findOneAndUpdate(
        { _id: lockId },
        {
          $setOnInsert: {
            _id: lockId,
            barber: bookingPreview.barber._id,
            date: bookingPreview.date,
          },
        },
        {
          upsert: true,
          new: true,
          session,
        }
      );

      const booking = await validateBookingSlot({
        barberId: payload.barber,
        serviceId: payload.service,
        date: payload.date,
        startTime: payload.startTime,
      });

      const created = await Appointment.create(
  [
   {
  customer: customer._id,
  barber: booking.barber._id,
  service: booking.service._id,
  date: booking.date,
  startTime: booking.startTime,
  endTime: booking.endTime,
  price: booking.price,

  paymentMethod: payload.paymentMethod,

  status: "confirmed",
  paymentStatus: "unpaid",
  notes: payload.notes || "",
}
  ],
  { session }
);

      appointment = created[0];
    });

    await appointment.populate(POPULATE_PATHS);

    return sendCreated(
      res,
      appointment,
      "Appointment created successfully"
    );
  } finally {
    await session.endSession();
  }
});

export const getAppointments = asyncHandler(async (req, res) => {
  const { barber, customer, status, paymentStatus, from, to, page, limit } =
    parseOrThrow(listQuerySchema, req.query);

  const filter = {};
  if (barber) filter.barber = barber;
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus; // <— NEW

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = parseDateOnly(from);
    if (to) filter.date.$lt = addDaysUTC(parseDateOnly(to), 1);
  }

  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate(POPULATE_PATHS),
    Appointment.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    { appointments, total, page, limit },
    "Appointments retrieved successfully"
  );
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "appointment ID");

  const appointment = await Appointment.findById(id).populate(POPULATE_PATHS);
  if (!appointment) throw new ApiError(404, "Appointment not found");

  // NEW: attach the latest live payment for convenience
  const withPayment = await attachPayment(appointment);

  return sendSuccess(res, withPayment, "Appointment retrieved successfully");
});

export const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = parseOrThrow(updateAppointmentSchema, req.body);

  const appointment = await loadAppointment(id);
  Object.assign(appointment, data);
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment updated successfully");
});

/**
 * Admin / barber cancellation — auto-refunds when the caller is
 * admin or barber. Customer self-cancellations go through
 * `cancelMyCustomerAppointment` and follow a "no auto-refund" policy.
 */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { cancellationReason } = parseOrThrow(
    cancelSchema,
    req.body || {}
  );

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  /*
   * Actor identity comes ONLY from authenticated server-side identity.
   * Never trust cancelledBy from req.body.
   */
  const actorRole = req.user.role;

  if (!["admin", "owner", "barber"].includes(actorRole)) {
    throw new ApiError(
      403,
      "You are not authorized to cancel appointments from this endpoint"
    );
  }

  const appointment = await loadAppointment(id);

  /*
   * Barber authorization:
   *
   * req.barber is populated by requireBarber middleware and represents
   * the authenticated barber's verified Barber document.
   *
   * Therefore Barber A cannot cancel Barber B's appointment.
   */
  if (actorRole === "barber") {
    if (!req.barber?._id) {
      throw new ApiError(403, "Barber authorization required");
    }

    if (
      String(appointment.barber) !==
      String(req.barber._id)
    ) {
      throw new ApiError(
        403,
        "You are not authorized to cancel this appointment"
      );
    }
  }

  ensureStatus(
    appointment,
    ["pending", "confirmed"],
    "cancel"
  );

  const session = await mongoose.startSession();
  let refundTriggered = false;

  try {
    await session.withTransaction(async () => {
      appointment.status = "cancelled";

      if (cancellationReason) {
        appointment.cancellationReason = cancellationReason;
      }

      /*
       * Refund policy is determined by SERVER-SIDE ROLE.
       *
       * customer -> no automatic refund
       * barber   -> full remaining refund
       * admin    -> full remaining refund
       * owner    -> full remaining refund
       */
      const shouldRefund =
        actorRole === "barber" ||
        actorRole === "admin" ||
        actorRole === "owner";

      if (shouldRefund) {
        const paid = await Payment.findOne({
          appointment: appointment._id,
          status: {
            $in: [
              "authorized",
              "completed",
              "partially_refunded",
            ],
          },
        }).session(session);

        if (paid) {
          const remaining =
            paid.amount - (paid.refundedAmount || 0);

          if (remaining > 0) {
            const refundReason =
              actorRole === "barber"
                ? "barber_cancellation"
                : "admin_refund";

            await Refund.create(
              [
                {
                  payment: paid._id,
                  appointment: appointment._id,
                  provider: paid.provider,

                  // SERVER-DERIVED — never from req.body
                  amount: remaining,

                  currency: paid.currency,
                  reason: refundReason,
                  status: "pending",

                  initiatedBy:
                    req.user.mongoId ||
                    req.user._id ||
                    null,

                  note:
                    `Auto-generated refund on appointment cancellation (${actorRole})`,
                },
              ],
              { session }
            );

            paid.refundedAmount =
              (paid.refundedAmount || 0) + remaining;

            paid.status =
              paid.refundedAmount >= paid.amount
                ? "refunded"
                : "partially_refunded";

            await paid.save({ session });

            if (paid.status === "refunded") {
              appointment.paymentStatus = "refunded";
            }

            refundTriggered = true;
          }
        }
      }

      await appointment.save({ session });
    });

    await appointment.populate(POPULATE_PATHS);

    return sendSuccess(
      res,
      {
        appointment,
        refundTriggered,
      },
      "Appointment cancelled successfully"
    );
  } finally {
    await session.endSession();
  }
});

export const confirmAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await loadAppointment(id);

  ensureStatus(appointment, ["pending"], "confirm");

  appointment.status = "confirmed";
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment confirmed successfully");
});

/**
 * Completion requires payment. An appointment with paymentStatus
 * "unpaid" cannot be marked completed — this prevents unpaid work
 * from being marked done and skewing stats.
 */
export const completeAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await loadAppointment(id);

  ensureStatus(appointment, ["pending", "confirmed"], "complete");

  if (appointment.paymentStatus === "unpaid") {
    throw new ApiError(
      409,
      "Cannot complete an appointment that has not been paid"
    );
  }

  if (appointment.paymentStatus === "refunded") {
    throw new ApiError(
      409,
      "Cannot complete an appointment that has been refunded"
    );
  }

  appointment.status = "completed";
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment completed successfully");
});

export const markNoShow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await loadAppointment(id);

  ensureStatus(appointment, ["pending", "confirmed"], "mark as no-show");

  // Business rule: a no-show on an unpaid appointment is a no-op
  // (nothing to charge, nothing to refund). A no-show on a paid
  // appointment typically keeps the deposit — that's a policy call,
  // so we don't touch paymentStatus here. Admins can refund manually
  // via the /refunds endpoint if needed.
  appointment.status = "no_show";
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment marked as no-show");
});

export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, startTime } = parseOrThrow(rescheduleSchema, req.body);

  const appointment = await loadAppointment(id);
  ensureStatus(appointment, ["pending", "confirmed"], "reschedule");

  const lockDate = parseDateOnly(date);
  if (!lockDate) {
    throw new ApiError(400, "Invalid appointment date");
  }

  const session = await mongoose.startSession();

  try {
    let updatedAppointment;

    await session.withTransaction(async () => {
      const lockId = `${String(appointment.barber)}_${date}`;

      await BookingLock.findOneAndUpdate(
        { _id: lockId },
        {
          $setOnInsert: {
            _id: lockId,
            barber: appointment.barber,
            date: lockDate,
          },
        },
        {
          upsert: true,
          new: true,
          session,
        }
      );

      const booking = await validateBookingSlot({
        barberId: appointment.barber,
        serviceId: appointment.service,
        date,
        startTime,
        excludeAppointmentId: appointment._id,
      });

      appointment.date = booking.date;
      appointment.startTime = booking.startTime;
      appointment.endTime = booking.endTime;
      // price intentionally not modified — stays the booking-time snapshot.

      await appointment.save({ session });

      updatedAppointment = appointment;
    });

    await updatedAppointment.populate(POPULATE_PATHS);

    return sendSuccess(
      res,
      updatedAppointment,
      "Appointment rescheduled successfully"
    );
  } finally {
    await session.endSession();
  }
});

/**
 * Deletion is blocked once any payment or refund exists — financial
 * history must not be silently dropped. Use status "cancelled"
 * instead of delete if you need to "remove" a paid appointment.
 */
export const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await loadAppointment(id);
  const appointmentId = appointment._id;

  const [paymentExists, refundExists] = await Promise.all([
    Payment.exists({ appointment: appointmentId }),
    Refund.exists({ appointment: appointmentId }),
  ]);

  if (paymentExists || refundExists) {
    throw new ApiError(
      409,
      "Cannot delete an appointment with associated payments or refunds"
    );
  }

  await appointment.deleteOne();

  return sendSuccess(
    res,
    { id: appointmentId },
    "Appointment deleted successfully"
  );
});

export const getMyCustomerAppointments = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.email) {
    throw new ApiError(401, "Authentication required");
  }
  if (req.user.role !== "customer") {
  throw new ApiError(
    403,
    "Only customers can use customer cancellation"
  );
}

  const customer = await Customer.findOne({
    $or: [{ userId: req.user.mongoId }, { email: req.user.email }],
  }).select("_id");

  if (!customer) {
    return sendSuccess(res, { appointments: [], total: 0 }, "No appointments found");
  }

  const appointments = await Appointment.find({ customer: customer._id })
    .sort({ date: -1, startTime: -1 })
    .populate(POPULATE_PATHS);

  return sendSuccess(
    res,
    { appointments, total: appointments.length },
    "Customer appointments retrieved successfully"
  );
});

/**
 * Customer self-cancellation.
 *
 * Policy: customer cancellations do NOT auto-refund — a deposit is
 * typically retained. Admins can issue refunds manually via
 * POST /api/refunds when warranted (e.g. the barber is at fault).
 */
export const cancelMyCustomerAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "appointment ID");

  if (!req.user || !req.user.email) {
    throw new ApiError(401, "Authentication required");
  }

  const appointment = await loadAppointment(id);

  const customer = await Customer.findOne({
    $or: [{ userId: req.user.mongoId }, { email: req.user.email }],
  }).select("_id");

  if (
    !customer ||
    String(appointment.customer._id || appointment.customer) !== String(customer._id)
  ) {
    throw new ApiError(403, "You are not authorized to cancel this appointment");
  }

  ensureStatus(appointment, ["pending", "confirmed"], "cancel");

  const cancellationReason =
    req.body?.cancellationReason && String(req.body.cancellationReason).trim()
      ? String(req.body.cancellationReason).trim()
      : "Cancelled by customer";

  appointment.status = "cancelled";
  appointment.cancellationReason = cancellationReason;
  // paymentStatus intentionally left as-is — admin handles refunds.
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment cancelled successfully");
});