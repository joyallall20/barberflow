// controllers/blockedTime.controller.js

import mongoose from "mongoose";
import { z } from "zod";

import BlockedTime from "../models/BlockedTime.js";
import Barber from "../models/Barber.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import { TIME_REGEX, parseDateOnly, timeToMinutes } from "../utils/time.js";

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
  ensureObjectId(barberId, "barber ID");

  const barber = await Barber.findById(barberId).select(
    "_id name active"
  );

  if (!barber) {
    throw new ApiError(404, "Barber not found");
  }

  if (!barber.active) {
    throw new ApiError(409, "Cannot block time for an inactive barber");
  }

  return barber;
};

/**
 * Check whether the requested blocked period overlaps
 * another active blocked period for the same barber/date.
 */
const ensureNoOverlap = async ({
  barber,
  date,
  startTime,
  endTime,
  excludeId,
}) => {
  const filter = {
    barber,
    date,
    active: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existing = await BlockedTime.findOne(filter).select("_id");

  if (existing) {
    throw new ApiError(
      409,
      "This blocked period overlaps another blocked period for this barber"
    );
  }
};

/* ------------------------------------------------------------------ */
/* Zod schemas                                                        */
/* ------------------------------------------------------------------ */

const createBlockedTimeSchema = z.object({
  barber: z
    .string()
    .regex(OBJECT_ID_REGEX, "Invalid barber ID"),

  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "date must be YYYY-MM-DD"
    ),

  startTime: z
    .string()
    .regex(TIME_REGEX, "startTime must be HH:MM"),

  endTime: z
    .string()
    .regex(TIME_REGEX, "endTime must be HH:MM"),

  reason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .default(""),

  active: z
    .boolean()
    .optional(),
});

const updateBlockedTimeSchema = z
  .object({
    barber: z
      .string()
      .regex(OBJECT_ID_REGEX, "Invalid barber ID")
      .optional(),

    date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "date must be YYYY-MM-DD"
      )
      .optional(),

    startTime: z
      .string()
      .regex(TIME_REGEX, "startTime must be HH:MM")
      .optional(),

    endTime: z
      .string()
      .regex(TIME_REGEX, "endTime must be HH:MM")
      .optional(),

    reason: z
      .string()
      .trim()
      .max(300)
      .optional(),

    active: z
      .boolean()
      .optional(),
  })
  .strict();

const listBlockedTimeSchema = z.object({
  barber: z
    .string()
    .regex(OBJECT_ID_REGEX, "Invalid barber ID")
    .optional(),

  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "date must be YYYY-MM-DD"
    )
    .optional(),

  active: z
    .enum(["true", "false"])
    .optional(),
});

/* ------------------------------------------------------------------ */
/* Controllers                                                        */
/* ------------------------------------------------------------------ */

/**
 * POST /api/admin/blocked-times
 */
export const createBlockedTime = asyncHandler(async (req, res) => {
  const data = parseOrThrow(
    createBlockedTimeSchema,
    req.body
  );

  const barber = await ensureActiveBarber(data.barber);

  const date = parseDateOnly(data.date);

  if (!date) {
    throw new ApiError(400, "Invalid blocked time date");
  }

  ensureValidTimeRange(
    data.startTime,
    data.endTime
  );

  await ensureNoOverlap({
    barber: barber._id,
    date,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  const blockedTime = await BlockedTime.create({
    barber: barber._id,
    date,
    startTime: data.startTime,
    endTime: data.endTime,
    reason: data.reason || "",
    active:
      typeof data.active === "boolean"
        ? data.active
        : true,
  });

  await blockedTime.populate({
    path: "barber",
    select: "name photo active",
  });

  return sendCreated(
    res,
    blockedTime,
    "Blocked time created successfully"
  );
});

/**
 * GET /api/admin/blocked-times
 *
 * Optional:
 * ?barber=<id>
 * ?date=YYYY-MM-DD
 * ?active=true
 */
export const getBlockedTimes = asyncHandler(async (req, res) => {
  const { barber, date, active } = parseOrThrow(
    listBlockedTimeSchema,
    req.query
  );

  const filter = {};

  if (barber) {
    filter.barber = barber;
  }

  if (date) {
    const parsedDate = parseDateOnly(date);

    if (!parsedDate) {
      throw new ApiError(400, "Invalid date");
    }

    filter.date = parsedDate;
  }

  if (typeof active !== "undefined") {
    filter.active = active === "true";
  }

  const blockedTimes = await BlockedTime.find(filter)
    .sort({
      date: 1,
      startTime: 1,
    })
    .populate("barber", "name photo active");

  return sendSuccess(
    res,
    blockedTimes,
    "Blocked times retrieved successfully"
  );
});

/**
 * GET /api/admin/blocked-times/:id
 */
export const getBlockedTimeById = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    ensureObjectId(id, "blocked time ID");

    const blockedTime = await BlockedTime.findById(id).populate(
      "barber",
      "name photo active"
    );

    if (!blockedTime) {
      throw new ApiError(
        404,
        "Blocked time not found"
      );
    }

    return sendSuccess(
      res,
      blockedTime,
      "Blocked time retrieved successfully"
    );
  }
);

/**
 * PATCH /api/admin/blocked-times/:id
 */
export const updateBlockedTime = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    ensureObjectId(id, "blocked time ID");

    const data = parseOrThrow(
      updateBlockedTimeSchema,
      req.body
    );

    const blockedTime = await BlockedTime.findById(id);

    if (!blockedTime) {
      throw new ApiError(
        404,
        "Blocked time not found"
      );
    }

    const barberId =
      data.barber || String(blockedTime.barber);

    const date = data.date
      ? parseDateOnly(data.date)
      : blockedTime.date;

    if (!date) {
      throw new ApiError(400, "Invalid blocked time date");
    }

    const startTime =
      data.startTime || blockedTime.startTime;

    const endTime =
      data.endTime || blockedTime.endTime;

    ensureValidTimeRange(startTime, endTime);

    const barber = await ensureActiveBarber(barberId);

    /**
     * Only active blocked periods participate
     * in overlap checking.
     */
    const resultingActive =
      typeof data.active === "boolean"
        ? data.active
        : blockedTime.active;

    if (resultingActive) {
      await ensureNoOverlap({
        barber: barber._id,
        date,
        startTime,
        endTime,
        excludeId: blockedTime._id,
      });
    }

    blockedTime.barber = barber._id;
    blockedTime.date = date;
    blockedTime.startTime = startTime;
    blockedTime.endTime = endTime;

    if (typeof data.reason !== "undefined") {
      blockedTime.reason = data.reason;
    }

    if (typeof data.active === "boolean") {
      blockedTime.active = data.active;
    }

    await blockedTime.save();

    await blockedTime.populate({
      path: "barber",
      select: "name photo active",
    });

    return sendSuccess(
      res,
      blockedTime,
      "Blocked time updated successfully"
    );
  }
);

/**
 * DELETE /api/admin/blocked-times/:id
 *
 * We hard-delete the record because this is an
 * admin-managed scheduling block. If you want
 * audit history later, we can change this to
 * deactivate instead.
 */
export const deleteBlockedTime = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    ensureObjectId(id, "blocked time ID");

    const blockedTime = await BlockedTime.findById(id);

    if (!blockedTime) {
      throw new ApiError(
        404,
        "Blocked time not found"
      );
    }

    await blockedTime.deleteOne();

    return sendSuccess(
      res,
      { id: blockedTime._id },
      "Blocked time deleted successfully"
    );
  }
);