// controllers/service.controller.js
import mongoose from "mongoose";
import { z } from "zod";

import Service from "../models/Service.js";
import Appointment from "../models/Appointment.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import { todayUTC } from "../utils/time.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const BLOCKING_STATUSES = ["pending", "confirmed"];

const ensureObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

const isStaff = (req) =>
  Boolean(req.user) &&
  (req.user.role === "admin" || req.user.role === "owner");

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const createServiceSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  description: z.string().trim().max(2000).optional().default(""),
  price: z
    .number({ invalid_type_error: "price must be a number" })
    .min(0, "price cannot be negative")
    .max(10000, "price is unreasonably high"),
  duration: z
    .number({ invalid_type_error: "duration must be a number" })
    .int("duration must be a whole number of minutes")
    .min(5, "duration must be at least 5 minutes")
    .max(600, "duration cannot exceed 600 minutes"),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateServiceSchema = createServiceSchema.partial();

/* ------------------------------------------------------------------ */
/* Controllers                                                         */
/* ------------------------------------------------------------------ */

export const getServices = asyncHandler(async (req, res) => {
  const includeInactive =
    req.query.includeInactive === "true" && isStaff(req);

  const filter = includeInactive ? {} : { active: true };

  const services = await Service.find(filter).sort({
    sortOrder: 1,
    createdAt: -1,
  });

  return sendSuccess(res, services, "Services retrieved successfully");
});

export const getServiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "service ID");

  const service = await Service.findById(id);
  if (!service) throw new ApiError(404, "Service not found");

  if (!service.active && !isStaff(req)) {
    // Don't leak inactive services to the public.
    throw new ApiError(404, "Service not found");
  }

  return sendSuccess(res, service, "Service retrieved successfully");
});

export const createService = asyncHandler(async (req, res) => {
  const data = parseOrThrow(createServiceSchema, req.body);

  const service = await Service.create(data);

  return sendCreated(res, service, "Service created successfully");
});

export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "service ID");

  const data = parseOrThrow(updateServiceSchema, req.body);

  const service = await Service.findById(id);
  if (!service) throw new ApiError(404, "Service not found");

  Object.assign(service, data);
  await service.save();

  return sendSuccess(res, service, "Service updated successfully");
});

export const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "service ID");

  const service = await Service.findById(id);
  if (!service) throw new ApiError(404, "Service not found");

  const upcoming = await Appointment.countDocuments({
    service: service._id,
    date: { $gte: todayUTC() },
    status: { $in: BLOCKING_STATUSES },
  });

  if (upcoming > 0) {
    throw new ApiError(
      409,
      `Cannot delete service with ${upcoming} upcoming appointment(s). Deactivate instead.`
    );
  }

  await service.deleteOne();

  return sendSuccess(res, { id: service._id }, "Service deleted successfully");
});

export const toggleServiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "service ID");

  const service = await Service.findById(id);
  if (!service) throw new ApiError(404, "Service not found");

  service.active = !service.active;
  await service.save();

  return sendSuccess(
    res,
    service,
    `Service ${service.active ? "activated" : "deactivated"} successfully`
  );
});