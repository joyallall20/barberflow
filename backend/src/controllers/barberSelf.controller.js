// controllers/barberSelf.controller.js
import { z } from "zod";
import Appointment from "../models/Appointment.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import { TIME_REGEX, timeToMinutes, todayUTC, parseDateOnly, addDaysUTC } from "../utils/time.js";
import { replaceImageSafely } from "../services/cloudinary.service.js";

/* ------------------------------------------------------------------ */
/* Zod Schemas                                                         */
/* ------------------------------------------------------------------ */

const updateSelfProfileSchema = z.object({
  bio: z.string().trim().max(500).optional(),
  specialties: z.array(z.string().trim().min(1).max(50)).optional(),
});

const workingHourSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    isWorking: z.boolean(),
    startTime: z.string().regex(TIME_REGEX, "startTime must be HH:MM").optional(),
    endTime: z.string().regex(TIME_REGEX, "endTime must be HH:MM").optional(),
  })
  .superRefine((wh, ctx) => {
    if (!wh.isWorking) return;
    if (!wh.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "startTime is required when isWorking is true",
      });
    }
    if (!wh.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "endTime is required when isWorking is true",
      });
    }
    if (
      wh.startTime &&
      wh.endTime &&
      timeToMinutes(wh.startTime) >= timeToMinutes(wh.endTime)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "endTime must be after startTime",
      });
    }
  });

const updateSelfWorkingHoursSchema = z.object({
  workingHours: z.array(workingHourSchema).min(1).max(7),
});

const appointmentQuerySchema = z.object({
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled", "no_show"])
    .optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* ------------------------------------------------------------------ */
/* Controllers                                                         */
/* ------------------------------------------------------------------ */

export const getMyBarberProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, req.barber, "Barber profile retrieved successfully");
});

export const updateMyBarberProfile = asyncHandler(async (req, res) => {
  const data = parseOrThrow(updateSelfProfileSchema, req.body);
  const barber = req.barber;

  if (data.bio !== undefined) barber.bio = data.bio;
  if (data.specialties !== undefined) barber.specialties = data.specialties;

  await barber.save();

  return sendSuccess(res, barber, "Profile updated successfully");
});

export const uploadMyBarberPhoto = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new ApiError(400, "Please upload an image file ('photo')");
  }

  const barber = req.barber;
  const oldPublicId = barber.photo?.publicId || null;

  const updatedBarber = await replaceImageSafely(
    req.file.buffer,
    oldPublicId,
    async (newPhoto) => {
      barber.photo = newPhoto;
      await barber.save();
      return barber;
    }
  );

  return sendSuccess(res, updatedBarber, "Photo uploaded successfully");
});

export const updateMyWorkingHours = asyncHandler(async (req, res) => {
  const { workingHours } = parseOrThrow(updateSelfWorkingHoursSchema, req.body);
  const barber = req.barber;

  // Validate day uniqueness
  const seen = new Set();
  for (const wh of workingHours) {
    if (seen.has(wh.day)) {
      throw new ApiError(400, `Duplicate working hours entry for day ${wh.day}`);
    }
    seen.add(wh.day);
  }

  barber.workingHours = workingHours;
  await barber.save();

  return sendSuccess(res, barber, "Working hours updated successfully");
});

export const getMyAppointments = asyncHandler(async (req, res) => {
  const { status, from, to, page, limit } = parseOrThrow(
    appointmentQuerySchema,
    req.query
  );

  // Strictly filter by req.barber._id (IDOR protection)
  const filter = { barber: req.barber._id };
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
      .populate("customer", "name email phone")
      .populate("service", "name price duration"),
    Appointment.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    { appointments, total, page, limit },
    "Appointments retrieved successfully"
  );
});

export const getMyDashboardOverview = asyncHandler(async (req, res) => {
  const barberId = req.barber._id;
  const today = todayUTC();
  const tomorrow = addDaysUTC(today, 1);
  const next7Days = addDaysUTC(today, 7);

  const [todayAppointments, upcomingAppointments, totalCompleted] =
    await Promise.all([
      Appointment.find({
        barber: barberId,
        date: { $gte: today, $lt: tomorrow },
        status: { $in: ["pending", "confirmed"] },
      })
        .sort({ startTime: 1 })
        .populate("customer", "name phone")
        .populate("service", "name duration"),

      Appointment.find({
        barber: barberId,
        date: { $gte: tomorrow, $lt: next7Days },
        status: { $in: ["pending", "confirmed"] },
      })
        .sort({ date: 1, startTime: 1 })
        .limit(10)
        .populate("customer", "name phone")
        .populate("service", "name duration"),

      Appointment.countDocuments({
        barber: barberId,
        status: "completed",
      }),
    ]);

  return sendSuccess(
    res,
    {
      todayCount: todayAppointments.length,
      todayAppointments,
      upcomingCount: upcomingAppointments.length,
      upcomingAppointments,
      totalCompleted,
    },
    "Barber dashboard overview retrieved"
  );
});
