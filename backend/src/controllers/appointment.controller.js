// controllers/appointment.controller.js
import mongoose from "mongoose";
import { z } from "zod";

import Appointment from "../models/Appointment.js";
import Customer from "../models/Customer.js";
import BookingLock from "../models/BookingLock.js";
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

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];
const POPULATE_PATHS = [
  { path: "customer", select: "name email phone" },
  { path: "barber", select: "name photo" },
  { path: "service", select: "name price duration" },
];

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
  notes: z.string().trim().max(1000).optional().default(""),
});

const listQuerySchema = z.object({
  barber: z.string().regex(OBJECT_ID_REGEX).optional(),
  customer: z.string().regex(OBJECT_ID_REGEX).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Generic update is intentionally narrow.
// Status transitions live on their dedicated endpoints:
//   /confirm, /complete, /no-show, /cancel, /reschedule
// Internal flags (reminderSent, reviewRequestSent, rebookingReminderSent)
// are not writable from the API at all.
const updateAppointmentSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
    cancellationReason: z.string().trim().max(500).optional(),
  })
  .strict();

const cancelSchema = z.object({
  cancellationReason: z.string().trim().max(500).optional().default(""),
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

  /*
   * Cheap pre-flight check BEFORE touching the DB for the customer.
   * If the barber is inactive, the service is inactive, or the date
   * is in the past, we fail fast without creating a customer.
   */
  const bookingPreview = await validateBookingSlot({
    barberId: payload.barber,
    serviceId: payload.service,
    date: payload.date,
    startTime: payload.startTime,
  });

  /*
   * Resolve/create the customer before the transaction.
   * findOrCreateCustomer handles the identity-race case by matching
   * on normalized email/phone.
   */
  const customer = await findOrCreateCustomer({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    preferredBarber: bookingPreview.barber._id,
    preferredService: bookingPreview.service._id,
    notes: payload.notes,
  });

  /*
   * Serialize bookings for the same barber/date.
   *
   * Both requests attempt to write the SAME BookingLock document
   * (_id = "<barberId>_<YYYY-MM-DD>"). MongoDB allows only one
   * uncommitted writer per document; the other transaction gets
   * a WriteConflict, which withTransaction retries automatically.
   *
   * On the retry, the availability re-check sees the first
   * transaction's committed appointment and throws 409.
   */
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

      /*
       * IMPORTANT: re-check availability AFTER acquiring the lock.
       * The pre-flight check at the top of this function is racy by
       * design (it runs outside the transaction); this re-check is
       * the one that matters.
       */
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
            price: booking.price, // price snapshot at booking time
            status: "confirmed",
            notes: payload.notes || "",
          },
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
  const { barber, customer, status, from, to, page, limit } = parseOrThrow(
    listQuerySchema,
    req.query
  );

  const filter = {};
  if (barber) filter.barber = barber;
  if (customer) filter.customer = customer;
  if (status) filter.status = status;

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

  return sendSuccess(res, appointment, "Appointment retrieved successfully");
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

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancellationReason } = parseOrThrow(cancelSchema, req.body || {});

  const appointment = await loadAppointment(id);
  ensureStatus(appointment, ["pending", "confirmed"], "cancel");

  appointment.status = "cancelled";
  if (cancellationReason) appointment.cancellationReason = cancellationReason;
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment cancelled successfully");
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

export const completeAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await loadAppointment(id);

  ensureStatus(appointment, ["pending", "confirmed"], "complete");

  appointment.status = "completed";
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment completed successfully");
});

export const markNoShow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await loadAppointment(id);

  ensureStatus(appointment, ["pending", "confirmed"], "mark as no-show");

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
      /*
       * Lock the TARGET barber/date.
       *
       * The lock id uses the raw "YYYY-MM-DD" string — exactly the
       * same format createAppointment uses, so both flows serialize
       * against the same BookingLock document.
       */
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

      /*
       * Re-check availability AFTER acquiring the lock.
       * The current appointment is excluded so rescheduling to its
       * existing slot doesn't conflict with itself.
       */
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

export const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await loadAppointment(id);
  const appointmentId = appointment._id;

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

export const cancelMyCustomerAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "appointment ID");

  if (!req.user || !req.user.email) {
    throw new ApiError(401, "Authentication required");
  }

  const appointment = await loadAppointment(id);

  // IDOR Protection: Verify caller owns this appointment via customer profile
  const customer = await Customer.findOne({
    $or: [{ userId: req.user.mongoId }, { email: req.user.email }],
  }).select("_id");

  if (!customer || String(appointment.customer._id || appointment.customer) !== String(customer._id)) {
    throw new ApiError(403, "You are not authorized to cancel this appointment");
  }

  ensureStatus(appointment, ["pending", "confirmed"], "cancel");

  const cancellationReason =
    req.body?.cancellationReason && String(req.body.cancellationReason).trim()
      ? String(req.body.cancellationReason).trim()
      : "Cancelled by customer";

  appointment.status = "cancelled";
  appointment.cancellationReason = cancellationReason;
  await appointment.save();
  await appointment.populate(POPULATE_PATHS);

  return sendSuccess(res, appointment, "Appointment cancelled successfully");
});