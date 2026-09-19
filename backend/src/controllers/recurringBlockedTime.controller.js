// controllers/recurringBlockedTime.controller.js

import mongoose from "mongoose";
import { z } from "zod";

import RecurringBlockedTime from "../models/RecurringBlockedTime.js";
import Barber from "../models/Barber.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import { TIME_REGEX, timeToMinutes, parseDateOnly } from "../utils/time.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const ensureObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

const ensureValidTimeRange = (startTime, endTime) => {
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new ApiError(400, "endTime must be later than startTime");
  }
};

const ensureActiveBarber = async (barberId) => {
  if (!barberId) return null;
  ensureObjectId(barberId, "barber ID");

  const barber = await Barber.findById(barberId).select("_id name active");

  if (!barber) {
    throw new ApiError(404, "Barber not found");
  }

  if (!barber.active) {
    throw new ApiError(409, "Cannot create rule for an inactive barber");
  }

  return barber;
};

const ensureNoOverlap = async ({
  scope,
  barber,
  daysOfWeek,
  startTime,
  endTime,
  startDate,
  endDate,
  excludeId,
}) => {
  const filter = {
    active: true,
    scope,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    daysOfWeek: { $in: daysOfWeek },
  };

  if (scope === "barber") {
    filter.barber = barber;
  }

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existingRules = await RecurringBlockedTime.find(filter).select(
    "_id startDate endDate"
  );

  for (const rule of existingRules) {
    const ruleStart = rule.startDate;
    const ruleEnd = rule.endDate;

    const isBefore = endDate && ruleStart && endDate < ruleStart;
    const isAfter = startDate && ruleEnd && startDate > ruleEnd;

    if (!isBefore && !isAfter) {
      throw new ApiError(
        409,
        "This recurring rule overlaps with another existing active rule"
      );
    }
  }
};

/* ------------------------------------------------------------------ */
/* Zod schemas                                                        */
/* ------------------------------------------------------------------ */

const recurringBlockedTimeSchema = z.object({
  scope: z.enum(["all_barbers", "barber"]),
  barber: z.string().regex(OBJECT_ID_REGEX, "Invalid barber ID").nullable().optional(),
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .nonempty("daysOfWeek must contain at least one day"),
  startTime: z.string().regex(TIME_REGEX, "startTime must be HH:MM"),
  endTime: z.string().regex(TIME_REGEX, "endTime must be HH:MM"),
  reason: z.string().trim().max(300).optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD").nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD").nullable().optional(),
  active: z.boolean().optional().default(true),
});

const updateRecurringBlockedTimeSchema = recurringBlockedTimeSchema.partial().strict();

/* ------------------------------------------------------------------ */
/* Controllers                                                        */
/* ------------------------------------------------------------------ */

/**
 * POST /api/admin/recurring-blocked-times
 */
export const createRecurringBlockedTime = asyncHandler(async (req, res) => {
  const data = parseOrThrow(recurringBlockedTimeSchema, req.body);

  if (data.scope === "all_barbers" && data.barber) {
    throw new ApiError(400, "barber must be null when scope is all_barbers");
  }

  if (data.scope === "barber" && !data.barber) {
    throw new ApiError(400, "barber is required when scope is barber");
  }

  const barber = data.scope === "barber" ? await ensureActiveBarber(data.barber) : null;

  ensureValidTimeRange(data.startTime, data.endTime);

  const parsedStartDate = data.startDate ? parseDateOnly(data.startDate) : null;
  const parsedEndDate = data.endDate ? parseDateOnly(data.endDate) : null;

  if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
    throw new ApiError(400, "endDate cannot be before startDate");
  }

  await ensureNoOverlap({
    scope: data.scope,
    barber: barber ? barber._id : null,
    daysOfWeek: data.daysOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
  });

  const rule = await RecurringBlockedTime.create({
    scope: data.scope,
    barber: barber ? barber._id : null,
    daysOfWeek: data.daysOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    reason: data.reason,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    active: data.active,
  });

  await rule.populate({
    path: "barber",
    select: "name photo active",
  });

  return sendCreated(res, rule, "Recurring blocked time created successfully");
});

/**
 * GET /api/admin/recurring-blocked-times
 */
export const getRecurringBlockedTimes = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.scope) {
    filter.scope = req.query.scope;
  }
  
  if (req.query.barber) {
    ensureObjectId(req.query.barber, "barber ID");
    filter.barber = req.query.barber;
  }

  if (typeof req.query.active !== "undefined") {
    filter.active = req.query.active === "true";
  }

  const rules = await RecurringBlockedTime.find(filter)
    .sort({ active: -1, scope: 1, startTime: 1 })
    .populate("barber", "name photo active");

  return sendSuccess(res, rules, "Recurring blocked times retrieved successfully");
});

/**
 * GET /api/admin/recurring-blocked-times/:id
 */
export const getRecurringBlockedTimeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  ensureObjectId(id, "recurring blocked time ID");

  const rule = await RecurringBlockedTime.findById(id).populate(
    "barber",
    "name photo active"
  );

  if (!rule) {
    throw new ApiError(404, "Recurring blocked time not found");
  }

  return sendSuccess(res, rule, "Recurring blocked time retrieved successfully");
});

/**
 * PATCH /api/admin/recurring-blocked-times/:id
 */
export const updateRecurringBlockedTime = asyncHandler(async (req, res) => {
  const { id } = req.params;

  ensureObjectId(id, "recurring blocked time ID");

  const data = parseOrThrow(updateRecurringBlockedTimeSchema, req.body);

  const rule = await RecurringBlockedTime.findById(id);

  if (!rule) {
    throw new ApiError(404, "Recurring blocked time not found");
  }

  const newScope = data.scope || rule.scope;
  
  // if data.barber is explicitly null, we allow it to overwrite.
  let newBarberId = rule.barber;
  if (data.barber !== undefined) {
    newBarberId = data.barber;
  }

  if (newScope === "all_barbers" && newBarberId) {
    throw new ApiError(400, "barber must be null when scope is all_barbers");
  }

  if (newScope === "barber" && !newBarberId) {
    throw new ApiError(400, "barber is required when scope is barber");
  }

  const barber = newScope === "barber" ? await ensureActiveBarber(newBarberId) : null;

  const newStartTime = data.startTime || rule.startTime;
  const newEndTime = data.endTime || rule.endTime;
  ensureValidTimeRange(newStartTime, newEndTime);

  let parsedStartDate = rule.startDate;
  if (data.startDate !== undefined) {
    parsedStartDate = data.startDate ? parseDateOnly(data.startDate) : null;
  }

  let parsedEndDate = rule.endDate;
  if (data.endDate !== undefined) {
    parsedEndDate = data.endDate ? parseDateOnly(data.endDate) : null;
  }

  if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
    throw new ApiError(400, "endDate cannot be before startDate");
  }

  const resultingActive = typeof data.active === "boolean" ? data.active : rule.active;
  const newDaysOfWeek = data.daysOfWeek || rule.daysOfWeek;

  if (resultingActive) {
    await ensureNoOverlap({
      scope: newScope,
      barber: barber ? barber._id : null,
      daysOfWeek: newDaysOfWeek,
      startTime: newStartTime,
      endTime: newEndTime,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      excludeId: rule._id,
    });
  }

  rule.scope = newScope;
  rule.barber = barber ? barber._id : null;
  rule.daysOfWeek = newDaysOfWeek;
  rule.startTime = newStartTime;
  rule.endTime = newEndTime;
  
  if (data.reason !== undefined) {
    rule.reason = data.reason;
  }
  
  rule.startDate = parsedStartDate;
  rule.endDate = parsedEndDate;
  rule.active = resultingActive;

  await rule.save();

  await rule.populate({
    path: "barber",
    select: "name photo active",
  });

  return sendSuccess(res, rule, "Recurring blocked time updated successfully");
});

/**
 * DELETE /api/admin/recurring-blocked-times/:id
 */
export const deleteRecurringBlockedTime = asyncHandler(async (req, res) => {
  const { id } = req.params;

  ensureObjectId(id, "recurring blocked time ID");

  const rule = await RecurringBlockedTime.findById(id);

  if (!rule) {
    throw new ApiError(404, "Recurring blocked time not found");
  }

  await rule.deleteOne();

  return sendSuccess(
    res,
    { id: rule._id },
    "Recurring blocked time deleted successfully"
  );
});
