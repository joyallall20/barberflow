// utils/time.js
import { DateTime } from "luxon";

export const SHOP_TIMEZONE = "America/Chicago";

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/* ------------------------------------------------------------------ */
/* "Now" helpers                                                       */
/* ------------------------------------------------------------------ */

export function nowInShopTimezone() {
  return DateTime.now().setZone(SHOP_TIMEZONE);
}

export function todayShopDate() {
  return nowInShopTimezone().toISODate();
}

/* ------------------------------------------------------------------ */
/* Date parsing                                                        */
/* ------------------------------------------------------------------ */

/**
 * Parse YYYY-MM-DD as a date in the shop timezone.
 *
 * Returns a real JS Date pinned to the UTC instant that corresponds
 * to shop-local midnight. Controllers pass this directly into
 * MongoDB queries (e.g. `{ date: { $gte: start } }`).
 */
export function parseDateOnly(dateString) {
  if (
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    return null;
  }

  const date = DateTime.fromISO(dateString, {
    zone: SHOP_TIMEZONE,
  });

  if (!date.isValid) {
    return null;
  }

  return date.startOf("day").toUTC().toJSDate();
}

/* ------------------------------------------------------------------ */
/* Time string <-> minutes                                             */
/* ------------------------------------------------------------------ */

export function timeToMinutes(time) {
  if (typeof time !== "string" || !TIME_REGEX.test(time)) {
    return null;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  if (
    !Number.isInteger(totalMinutes) ||
    totalMinutes < 0 ||
    totalMinutes > 1439
  ) {
    return null;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

/* ------------------------------------------------------------------ */
/* Day / week / month boundaries                                       */
/* ------------------------------------------------------------------ */

/** Start of today in Austin, as a Luxon DateTime. */
export function startOfDay() {
  return nowInShopTimezone().startOf("day");
}

/** Start of today in Austin, as a JS Date (UTC instant). */
export function startOfDayUTC() {
  return startOfDay().toUTC().toJSDate();
}

/**
 * Start of the current business week (Sunday).
 * Luxon weekday: Mon=1 … Sun=7, so `weekday % 7` gives Sun=0 … Sat=6.
 */
export function startOfWeek() {
  const now = nowInShopTimezone();
  const daysSinceSunday = now.weekday % 7;
  return now.startOf("day").minus({ days: daysSinceSunday });
}

export function startOfWeekUTC() {
  return startOfWeek().toUTC().toJSDate();
}

export function startOfMonthUTC() {
  return nowInShopTimezone().startOf("month").toUTC().toJSDate();
}

/**
 * Add N days in the shop timezone, DST-safe.
 * Accepts and returns a JS Date (UTC instant at shop-midnight).
 */
export function addDaysUTC(date, days) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return DateTime.fromJSDate(date, { zone: "utc" })
    .setZone(SHOP_TIMEZONE)
    .plus({ days })
    .startOf("day")
    .toUTC()
    .toJSDate();
}

/** Today at Austin midnight, as a JS Date. */
export function todayUTC() {
  return startOfDayUTC();
}

/* ------------------------------------------------------------------ */
/* Shop-aware date checks                                              */
/* ------------------------------------------------------------------ */

/**
 * Weekday for a YYYY-MM-DD date string.
 * Sunday = 0 … Saturday = 6.
 */
export function getShopWeekday(dateString) {
  if (
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    return null;
  }
  const dt = DateTime.fromISO(dateString, { zone: SHOP_TIMEZONE });
  if (!dt.isValid) return null;
  return dt.weekday % 7;
}

/** True if the given YYYY-MM-DD is strictly before today in Austin. */
export function isPastShopDate(dateString) {
  const date = parseDateOnly(dateString);
  if (!date) return false;
  return date.getTime() < startOfDayUTC().getTime();
}

/** Minutes since midnight right now in Austin. */
export function currentShopMinutes() {
  const now = nowInShopTimezone();
  return now.hour * 60 + now.minute;
}

/* ------------------------------------------------------------------ */
/* Shop-local <-> UTC conversions                                      */
/* ------------------------------------------------------------------ */

/**
 * Combine a shop-local date + HH:mm into the correct UTC JS Date
 * (accounts for CDT/CST).
 */
export function shopDateTimeToUTC(dateString, timeString) {
  const minutes = timeToMinutes(timeString);
  if (minutes === null) return null;

  if (
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    return null;
  }

  const base = DateTime.fromISO(dateString, { zone: SHOP_TIMEZONE });
  if (!base.isValid) return null;

  return base.plus({ minutes }).toUTC().toJSDate();
}

export function utcToShopDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return DateTime.fromJSDate(date, { zone: "utc" }).setZone(SHOP_TIMEZONE);
}

export function utcToShopTime(date) {
  const dt = utcToShopDateTime(date);
  return dt ? dt.toFormat("HH:mm") : null;
}

export function utcToShopDate(date) {
  const dt = utcToShopDateTime(date);
  return dt ? dt.toISODate() : null;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Short weekday label.
 *
 * Accepts EITHER:
 *   - an integer 0..6 (0 = Sunday)
 *   - a JS Date (interpreted as a UTC instant, viewed in shop TZ)
 *
 * This dual signature keeps existing call sites in
 * dashboard.controller.js (which passes a Date) working.
 */
export function weekdayShort(input) {
  const LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (typeof input === "number") {
    return LABELS[input] ?? "";
  }

  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    const idx =
      DateTime.fromJSDate(input, { zone: "utc" })
        .setZone(SHOP_TIMEZONE)
        .weekday % 7;
    return LABELS[idx] ?? "";
  }

  return "";
}