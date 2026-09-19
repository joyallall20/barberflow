
// services/availability.service.js

import mongoose from "mongoose";
import { DateTime } from "luxon";

import Barber from "../models/Barber.js";
import Service from "../models/Service.js";
import Appointment from "../models/Appointment.js";
import BlockedTime from "../models/BlockedTime.js";
import RecurringBlockedTime from "../models/RecurringBlockedTime.js";

import ApiError from "../utils/ApiError.js";
import {
  SHOP_TIMEZONE,
  TIME_REGEX,
  timeToMinutes,
  minutesToTime,
  parseDateOnly,
  todayShopDate,
  currentShopMinutes,
  getShopWeekday,
  shopDateTimeToUTC,
} from "../utils/time.js";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const SLOT_INTERVAL_MINUTES = 15;
const BLOCKING_STATUSES = ["pending", "confirmed"];

const SHOP_TIMEZONE_NAME = SHOP_TIMEZONE || "America/Chicago";

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

const loadBarberAndService = async (barberId, serviceId) => {
  if (!mongoose.Types.ObjectId.isValid(barberId)) {
    throw new ApiError(400, "Invalid barber ID");
  }

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new ApiError(400, "Invalid service ID");
  }

  const [barber, service] = await Promise.all([
    Barber.findById(barberId),
    Service.findById(serviceId),
  ]);

  if (!barber) {
    throw new ApiError(404, "Barber not found");
  }

  if (!barber.active) {
    throw new ApiError(400, "Barber is not currently available");
  }

  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  if (!service.active) {
    throw new ApiError(400, "Service is not currently available");
  }

  if (!Number.isFinite(service.duration) || service.duration <= 0) {
    throw new ApiError(400, "Service duration is invalid");
  }

  return { barber, service };
};

/**
 * Get barber working hours for a shop-local date.
 */
const getWorkingWindowForDay = (barber, dateString) => {
  const dow = getShopWeekday(dateString);

  if (dow === null) {
    return null;
  }

  const wh = (barber.workingHours || []).find(
    (w) => w.day === dow
  );

  if (!wh || !wh.isWorking) {
    return null;
  }

  if (
    !TIME_REGEX.test(wh.startTime || "") ||
    !TIME_REGEX.test(wh.endTime || "")
  ) {
    return null;
  }

  const start = timeToMinutes(wh.startTime);
  const end = timeToMinutes(wh.endTime);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start >= end
  ) {
    return null;
  }

  return {
    start,
    end,
  };
};

/**
 * Convert an Austin-local calendar date into the UTC range
 * representing that entire local day.
 */
const getUTCDateRange = (dateString) => {
  const start = shopDateTimeToUTC(dateString, "00:00");

  if (!start) {
    throw new ApiError(
      400,
      "Invalid date. Expected format YYYY-MM-DD"
    );
  }

  const nextDay = DateTime.fromISO(dateString, {
    zone: SHOP_TIMEZONE_NAME,
  })
    .plus({ days: 1 })
    .startOf("day")
    .toUTC()
    .toJSDate();

  return {
    start,
    end: nextDay,
  };
};

/**
 * Get existing appointments that block a barber.
 *
 * Times are kept as shop-local HH:mm values because appointments
 * use the same local booking-time representation.
 */
const getBusyIntervals = async (
  barberId,
  dateString,
  excludeAppointmentId = null
) => {
  const { start, end } = getUTCDateRange(dateString);

  const query = {
    barber: barberId,
    date: {
      $gte: start,
      $lt: end,
    },
    status: {
      $in: BLOCKING_STATUSES,
    },
  };

  if (excludeAppointmentId) {
    if (!mongoose.Types.ObjectId.isValid(excludeAppointmentId)) {
      throw new ApiError(400, "Invalid appointment ID");
    }

    query._id = {
      $ne: excludeAppointmentId,
    };
  }

  const appointments = await Appointment.find(query)
    .select("startTime endTime")
    .lean();

  return appointments
    .map((appointment) => ({
      start: timeToMinutes(appointment.startTime),
      end: timeToMinutes(appointment.endTime),
    }))
    .filter(
      (interval) =>
        Number.isFinite(interval.start) &&
        Number.isFinite(interval.end) &&
        interval.start < interval.end
    );
};

/**
 * Get blocked periods for a barber on an Austin-local date.
 */
const getBlockedIntervals = async (
  barberId,
  dateString
) => {
  const { start, end } = getUTCDateRange(dateString);

  const blockedTimes = await BlockedTime.find({
    barber: barberId,
    date: {
      $gte: start,
      $lt: end,
    },
    active: true,
  })
    .select("startTime endTime")
    .lean();

  return blockedTimes
    .map((blocked) => ({
      start: timeToMinutes(blocked.startTime),
      end: timeToMinutes(blocked.endTime),
    }))
    .filter(
      (interval) =>
        Number.isFinite(interval.start) &&
        Number.isFinite(interval.end) &&
        interval.start < interval.end
    );
};

/**
 * Get recurring blocked periods for a barber on an Austin-local date.
 */
const getRecurringBlockedIntervals = async (barberId, dateString) => {
  const dow = getShopWeekday(dateString);
  if (dow === null) return [];

  const queryDate = parseDateOnly(dateString);

  const recurringBlocks = await RecurringBlockedTime.find({
    active: true,
    daysOfWeek: dow,
    $or: [
      { scope: "all_barbers" },
      { scope: "barber", barber: barberId }
    ],
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: queryDate } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: queryDate } }] }
    ]
  }).select("startTime endTime").lean();

  return recurringBlocks
    .map((blocked) => ({
      start: timeToMinutes(blocked.startTime),
      end: timeToMinutes(blocked.endTime),
    }))
    .filter(
      (interval) =>
        Number.isFinite(interval.start) &&
        Number.isFinite(interval.end) &&
        interval.start < interval.end
    );
};

/**
 * Check whether a proposed interval overlaps another interval.
 */
const hasOverlap = (start, end, intervals) =>
  intervals.some(
    (interval) =>
      start < interval.end &&
      end > interval.start
  );

/**
 * Remove slots that have already passed TODAY in Austin.
 */
const filterPastSlots = (slots, dateString) => {
  if (dateString !== todayShopDate()) {
    return slots;
  }

  const nowMinutes = currentShopMinutes();

  return slots.filter(
    (time) => timeToMinutes(time) > nowMinutes
  );
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Returns available HH:mm slots that can accommodate
 * the complete service.
 */
export const getAvailableSlots = async ({
  barberId,
  serviceId,
  date,
}) => {
  const day = parseDateOnly(date);

  if (!day) {
    throw new ApiError(
      400,
      "Invalid date. Expected format YYYY-MM-DD"
    );
  }

  const { barber, service } =
    await loadBarberAndService(
      barberId,
      serviceId
    );

  const window = getWorkingWindowForDay(
    barber,
    date
  );

  if (!window) {
    return [];
  }

  const [busyAppointments, blockedTimes, recurringBlockedTimes] =
    await Promise.all([
      getBusyIntervals(barber._id, date),
      getBlockedIntervals(barber._id, date),
      getRecurringBlockedIntervals(barber._id, date),
    ]);

  const busy = [
    ...busyAppointments,
    ...blockedTimes,
    ...recurringBlockedTimes,
  ];

  const slots = [];

  for (
    let start = window.start;
    start + service.duration <= window.end;
    start += SLOT_INTERVAL_MINUTES
  ) {
    const end = start + service.duration;

    if (!hasOverlap(start, end, busy)) {
      slots.push(minutesToTime(start));
    }
  }

  return filterPastSlots(slots, date);
};

/**
 * Validates that a specific Austin-local booking slot
 * is currently bookable.
 */
export const validateBookingSlot = async ({
  barberId,
  serviceId,
  date,
  startTime,
  excludeAppointmentId = null,
}) => {
  const day = parseDateOnly(date);

  if (!day) {
    throw new ApiError(
      400,
      "Invalid date. Expected format YYYY-MM-DD"
    );
  }

  if (!TIME_REGEX.test(startTime || "")) {
    throw new ApiError(
      400,
      "Invalid startTime. Expected format HH:MM"
    );
  }

  /* -------------------------------------------------------------- */
  /* Past date                                                       */
  /* -------------------------------------------------------------- */

  const today = todayShopDate();

  if (date < today) {
    throw new ApiError(
      400,
      "Cannot book a date in the past"
    );
  }

  /* -------------------------------------------------------------- */
  /* Barber + service                                                */
  /* -------------------------------------------------------------- */

  const { barber, service } =
    await loadBarberAndService(
      barberId,
      serviceId
    );

  /* -------------------------------------------------------------- */
  /* Working hours                                                   */
  /* -------------------------------------------------------------- */

  const window = getWorkingWindowForDay(
    barber,
    date
  );

  if (!window) {
    throw new ApiError(
      409,
      "Barber is not working on the selected day"
    );
  }

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + service.duration;

  if (
    startMin < window.start ||
    endMin > window.end
  ) {
    throw new ApiError(
      409,
      "Requested time is outside the barber's working hours"
    );
  }

  /* -------------------------------------------------------------- */
  /* Past time TODAY                                                 */
  /* -------------------------------------------------------------- */

  if (date === today) {
    const nowMinutes = currentShopMinutes();

    if (startMin <= nowMinutes) {
      throw new ApiError(
        409,
        "The requested time has already passed"
      );
    }
  }

  /* -------------------------------------------------------------- */
  /* Existing appointments + blocked periods                         */
  /* -------------------------------------------------------------- */

  const [busyAppointments, blockedTimes, recurringBlockedTimes] =
    await Promise.all([
      getBusyIntervals(
        barber._id,
        date,
        excludeAppointmentId
      ),
      getBlockedIntervals(
        barber._id,
        date
      ),
      getRecurringBlockedIntervals(
        barber._id,
        date
      ),
    ]);

  const busy = [
    ...busyAppointments,
    ...blockedTimes,
    ...recurringBlockedTimes,
  ];

  if (hasOverlap(startMin, endMin, busy)) {
    throw new ApiError(
      409,
      "The requested time slot is no longer available"
    );
  }

  /* -------------------------------------------------------------- */
  /* Booking data                                                    */
  /* -------------------------------------------------------------- */

  return {
    barber,
    service,

    // Austin midnight represented as the correct UTC Date.
    date: shopDateTimeToUTC(date, "00:00"),

    startTime,

    endTime: minutesToTime(endMin),

    price: service.price,
  };
};
