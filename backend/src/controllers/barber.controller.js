// controllers/barber.controller.js
import mongoose from "mongoose";
import { z } from "zod";

import Barber from "../models/Barber.js";
import Appointment from "../models/Appointment.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import { TIME_REGEX, timeToMinutes, todayUTC } from "../utils/time.js";
import {
  replaceImageSafely,
  deleteImageByPublicId,
} from "../services/cloudinary.service.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const BLOCKING_STATUSES = ["pending", "confirmed"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ensureObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

const isStaff = (req) =>
  Boolean(req.user) &&
  (req.user.role === "admin" || req.user.role === "owner");

const assertUniqueDays = (workingHours) => {
  const seen = new Set();
  for (const wh of workingHours) {
    if (seen.has(wh.day)) {
      throw new ApiError(400, `Duplicate working hours entry for day ${wh.day}`);
    }
    seen.add(wh.day);
  }
};

const sanitizeBarberResponse = (barberDoc, req) => {
  const obj = barberDoc.toObject ? barberDoc.toObject() : { ...barberDoc };
  if (!isStaff(req)) {
    delete obj.email;
    delete obj.userId;
  }
  return obj;
};

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const workingHourSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    isWorking: z.boolean(),
    startTime: z
      .string()
      .regex(TIME_REGEX, "startTime must be HH:MM")
      .optional(),
    endTime: z
      .string()
      .regex(TIME_REGEX, "endTime must be HH:MM")
      .optional(),
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

const photoSchema = z
  .object({
    url: z.string().trim().max(1024).optional().nullable(),
    publicId: z.string().trim().max(256).optional().nullable(),
  })
  .optional()
  .nullable();

const createBarberSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z
    .string()
    .trim()
    .min(5)
    .max(254)
    .regex(EMAIL_REGEX, "Please provide a valid email address"),
  photo: photoSchema,
  bio: z.string().trim().max(500).optional().default(""),
  specialties: z
    .array(z.string().trim().min(1).max(50))
    .optional()
    .default([]),
  workingHours: z.array(workingHourSchema).max(7).optional(),
  active: z.boolean().optional().default(true),
});

// Explicitly omit immutable/security fields from update schema
const updateBarberSchema = createBarberSchema
  .omit({ email: true })
  .partial();

const updateWorkingHoursSchema = z.object({
  workingHours: z.array(workingHourSchema).min(1).max(7),
});

/* ------------------------------------------------------------------ */
/* Controllers                                                         */
/* ------------------------------------------------------------------ */

export const getBarbers = asyncHandler(async (req, res) => {
  const includeInactive =
    req.query.includeInactive === "true" && isStaff(req);

  const filter = includeInactive ? {} : { active: true };
  const projection = isStaff(req) ? {} : { email: 0, userId: 0 };

  const barbers = await Barber.find(filter, projection).sort({ createdAt: -1 });

  return sendSuccess(res, barbers, "Barbers retrieved successfully");
});

export const getBarberById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "barber ID");

  const projection = isStaff(req) ? {} : { email: 0, userId: 0 };
  const barber = await Barber.findById(id, projection);

  if (!barber) throw new ApiError(404, "Barber not found");

  if (!barber.active && !isStaff(req)) {
    throw new ApiError(404, "Barber not found");
  }

  return sendSuccess(res, barber, "Barber retrieved successfully");
});

export const createBarber = asyncHandler(async (req, res) => {
  const data = parseOrThrow(createBarberSchema, req.body);
  data.email = data.email.trim().toLowerCase();

  if (data.workingHours) assertUniqueDays(data.workingHours);

  let barber;
  try {
    barber = await Barber.create(data);
  } catch (err) {
    if (err.code === 11000) {
      const dupField = Object.keys(err.keyPattern || {})[0] || "email";
      throw new ApiError(409, `A barber with that ${dupField} already exists`);
    }
    throw err;
  }

  return sendCreated(
    res,
    sanitizeBarberResponse(barber, req),
    "Barber created successfully"
  );
});

export const updateBarber = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "barber ID");

  const data = parseOrThrow(updateBarberSchema, req.body);
  if (data.workingHours) assertUniqueDays(data.workingHours);

  const barber = await Barber.findById(id);
  if (!barber) throw new ApiError(404, "Barber not found");

  // Prevent modifying email or userId via updateBarber
  delete data.userId;
  delete data.email;

  Object.assign(barber, data);

  try {
    await barber.save();
  } catch (err) {
    if (err.code === 11000) {
      const dupField = Object.keys(err.keyPattern || {})[0] || "field";
      throw new ApiError(409, `A barber with that ${dupField} already exists`);
    }
    throw err;
  }

  return sendSuccess(
    res,
    sanitizeBarberResponse(barber, req),
    "Barber updated successfully"
  );
});

export const uploadBarberPhoto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "barber ID");

  if (!req.file || !req.file.buffer) {
    throw new ApiError(400, "Please upload an image file ('photo')");
  }

  const barber = await Barber.findById(id);
  if (!barber) throw new ApiError(404, "Barber not found");

  const oldPublicId = barber.photo?.publicId || null;

  // Safe replacement: upload to Cloudinary -> DB save -> delete old asset
  const updatedBarber = await replaceImageSafely(
    req.file.buffer,
    oldPublicId,
    async (newPhoto) => {
      barber.photo = newPhoto;
      await barber.save();
      return barber;
    }
  );

  return sendSuccess(
    res,
    sanitizeBarberResponse(updatedBarber, req),
    "Barber photo uploaded successfully"
  );
});

export const deleteBarber = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "barber ID");

  const barber = await Barber.findById(id);
  if (!barber) throw new ApiError(404, "Barber not found");

  const upcoming = await Appointment.countDocuments({
    barber: barber._id,
    date: { $gte: todayUTC() },
    status: { $in: BLOCKING_STATUSES },
  });

  if (upcoming > 0) {
    throw new ApiError(
      409,
      `Cannot delete barber with ${upcoming} upcoming appointment(s). Deactivate instead.`
    );
  }

  const photoPublicId = barber.photo?.publicId;

  await barber.deleteOne();

  // Cleanup Cloudinary image asset upon successful DB deletion
  if (photoPublicId) {
    deleteImageByPublicId(photoPublicId).catch((err) =>
      console.error("Non-blocking Cloudinary deletion error on barber remove:", err)
    );
  }

  return sendSuccess(res, { id: barber._id }, "Barber deleted successfully");
});

export const toggleBarberStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "barber ID");

  const barber = await Barber.findById(id);
  if (!barber) throw new ApiError(404, "Barber not found");

  barber.active = !barber.active;
  await barber.save();

  return sendSuccess(
    res,
    sanitizeBarberResponse(barber, req),
    `Barber ${barber.active ? "activated" : "deactivated"} successfully`
  );
});

export const updateWorkingHours = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "barber ID");

  const { workingHours } = parseOrThrow(updateWorkingHoursSchema, req.body);
  assertUniqueDays(workingHours);

  const barber = await Barber.findById(id);
  if (!barber) throw new ApiError(404, "Barber not found");

  barber.workingHours = workingHours;
  await barber.save();

  return sendSuccess(
    res,
    sanitizeBarberResponse(barber, req),
    "Working hours updated successfully"
  );
});