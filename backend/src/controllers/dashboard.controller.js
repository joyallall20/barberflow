// controllers/dashboard.controller.js
import { DateTime } from "luxon";
import { z } from "zod";

import Appointment from "../models/Appointment.js";
import Customer from "../models/Customer.js";
import Barber from "../models/Barber.js";
import Service from "../models/Service.js";

import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import {
  SHOP_TIMEZONE,
  startOfDayUTC,
  startOfWeekUTC,
  startOfMonthUTC,
  addDaysUTC,
  weekdayShort,
  shopDateTimeToUTC,
  utcToShopDate,
} from "../utils/time.js";

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

const BLOCKING_STATUSES = ["pending", "confirmed"];
const POPULATE_PATHS = [
  { path: "customer", select: "name email phone" },
  { path: "barber", select: "name photo" },
  { path: "service", select: "name price duration" },
];

/* ------------------------------------------------------------------ */
/* Aggregation helpers                                                 */
/* ------------------------------------------------------------------ */

const emptyStats = () => ({
  total: 0,
  completed: 0,
  cancelled: 0,
  noShow: 0,
  upcoming: 0,
  revenue: 0,
  expectedRevenue: 0,
});

/**
 * Runs a single aggregation over appointments within [from, to).
 * Pass null/null for "all time".
 */
const aggregateRange = async (from, to) => {
  const match = {};
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lt = to;
  }

  const pipeline = [];
  if (Object.keys(match).length) pipeline.push({ $match: match });

  pipeline.push({
    $group: {
      _id: null,
      total: { $sum: 1 },
      completed: {
        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
      },
      cancelled: {
        $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
      },
      noShow: {
        $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
      },
      upcoming: {
        $sum: {
          $cond: [{ $in: ["$status", BLOCKING_STATUSES] }, 1, 0],
        },
      },
      revenue: {
        $sum: {
          $cond: [{ $eq: ["$status", "completed"] }, "$price", 0],
        },
      },
      expectedRevenue: {
        $sum: {
          $cond: [{ $in: ["$status", BLOCKING_STATUSES] }, "$price", 0],
        },
      },
    },
  });

  const [row] = await Appointment.aggregate(pipeline);
  if (!row) return emptyStats();
  const { _id, ...rest } = row;
  return rest;
};

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const upcomingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const revenueQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

/* ------------------------------------------------------------------ */
/* Controllers                                                         */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/dashboard/overview
 * Returns today / week / month / all-time appointment stats + revenue,
 * plus inventory counts (customers, barbers, services).
 */
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const today = startOfDayUTC();
  const tomorrow = addDaysUTC(today, 1);

  const weekStart = startOfWeekUTC();
  const weekEnd = addDaysUTC(weekStart, 7);

  const monthStart = startOfMonthUTC();
  const monthEnd = DateTime.now()
    .setZone(SHOP_TIMEZONE)
    .startOf("month")
    .plus({ months: 1 })
    .toUTC()
    .toJSDate();

  const [
    todayStats,
    weekStats,
    monthStats,
    allTimeStats,
    totalCustomers,
    activeBarbers,
    activeServices,
    statusBreakdown,
  ] = await Promise.all([
    aggregateRange(today, tomorrow),
    aggregateRange(weekStart, weekEnd),
    aggregateRange(monthStart, monthEnd),
    aggregateRange(null, null),
    Customer.countDocuments({ active: true }),
    Barber.countDocuments({ active: true }),
    Service.countDocuments({ active: true }),
    Appointment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = statusBreakdown.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  return sendSuccess(
    res,
    {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      allTime: allTimeStats,
      statusCounts,
      inventory: {
        customers: totalCustomers,
        activeBarbers,
        activeServices,
      },
      generatedAt: new Date().toISOString(),
    },
    "Dashboard overview retrieved successfully"
  );
});

/**
 * GET /api/admin/dashboard/today
 * Full populated list of today's appointments, chronological.
 */
export const getTodayAppointments = asyncHandler(async (req, res) => {
  const today = startOfDayUTC();
  const tomorrow = addDaysUTC(today, 1);

  const appointments = await Appointment.find({
    date: { $gte: today, $lt: tomorrow },
  })
    .sort({ startTime: 1 })
    .populate(POPULATE_PATHS);

  return sendSuccess(
    res,
    {
      date: DateTime.now().setZone(SHOP_TIMEZONE).toISODate(),
      appointments,
    },
    "Today's appointments retrieved successfully"
  );
});

/**
 * GET /api/admin/dashboard/upcoming?limit=10
 * Next pending/confirmed appointments from today forward.
 */
export const getUpcomingAppointments = asyncHandler(async (req, res) => {
  const { limit } = parseOrThrow(upcomingQuerySchema, req.query);

  const today = startOfDayUTC();

  const appointments = await Appointment.find({
    date: { $gte: today },
    status: { $in: BLOCKING_STATUSES },
  })
    .sort({ date: 1, startTime: 1 })
    .limit(limit)
    .populate(POPULATE_PATHS);

  return sendSuccess(
    res,
    { appointments },
    "Upcoming appointments retrieved successfully"
  );
});

/**
 * GET /api/admin/dashboard/weekly
 * Per-day stats for the current Sunday-start week.
 * Missing days are returned with zeros so the chart always has 7 buckets.
 */
export const getWeeklyStats = asyncHandler(async (req, res) => {
  const weekStart = startOfWeekUTC();
  const weekEnd = addDaysUTC(weekStart, 7);

  const rows = await Appointment.aggregate([
    { $match: { date: { $gte: weekStart, $lt: weekEnd } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
            timezone: SHOP_TIMEZONE,
          },
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        noShow: {
          $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
        },
        upcoming: {
          $sum: {
            $cond: [{ $in: ["$status", BLOCKING_STATUSES] }, 1, 0],
          },
        },
        revenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, "$price", 0],
          },
        },
        expectedRevenue: {
          $sum: {
            $cond: [{ $in: ["$status", BLOCKING_STATUSES] }, "$price", 0],
          },
        },
      },
    },
  ]);

  const byDate = rows.reduce((acc, r) => {
    acc[r._id] = r;
    return acc;
  }, {});

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addDaysUTC(weekStart, i);
    const key = utcToShopDate(d);
    const row = byDate[key];
    days.push({
      date: key,
      label: weekdayShort(d),
      total: row?.total ?? 0,
      completed: row?.completed ?? 0,
      cancelled: row?.cancelled ?? 0,
      noShow: row?.noShow ?? 0,
      upcoming: row?.upcoming ?? 0,
      revenue: row?.revenue ?? 0,
      expectedRevenue: row?.expectedRevenue ?? 0,
    });
  }

  const totals = days.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      completed: acc.completed + d.completed,
      cancelled: acc.cancelled + d.cancelled,
      noShow: acc.noShow + d.noShow,
      upcoming: acc.upcoming + d.upcoming,
      revenue: acc.revenue + d.revenue,
      expectedRevenue: acc.expectedRevenue + d.expectedRevenue,
    }),
    { ...emptyStats() }
  );
  delete totals._id;

  return sendSuccess(
    res,
    {
      weekStart: utcToShopDate(weekStart),
      weekEnd: utcToShopDate(addDaysUTC(weekStart, 6)),
      days,
      totals,
    },
    "Weekly stats retrieved successfully"
  );
});

/**
 * GET /api/admin/dashboard/revenue?from=&to=&groupBy=day|week|month
 * Bucketed revenue over a range. Defaults to last 30 days, grouped by day.
 */
export const getRevenueStats = asyncHandler(async (req, res) => {
  const { from, to, groupBy } = parseOrThrow(revenueQuerySchema, req.query);

  const rangeEnd = to
    ? shopDateTimeToUTC(to, "00:00")
    : addDaysUTC(startOfDayUTC(), 1);

  const rangeStart = from
    ? shopDateTimeToUTC(from, "00:00")
    : addDaysUTC(rangeEnd, -30);

  const format =
    groupBy === "month"
      ? "%Y-%m"
      : groupBy === "week"
      ? "%G-W%V"
      : "%Y-%m-%d";

  const rows = await Appointment.aggregate([
    { $match: { date: { $gte: rangeStart, $lt: rangeEnd } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format,
            date: "$date",
            timezone: SHOP_TIMEZONE,
          },
        },
        count: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        noShowCount: {
          $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
        },
        revenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, "$price", 0],
          },
        },
        expectedRevenue: {
          $sum: {
            $cond: [{ $in: ["$status", BLOCKING_STATUSES] }, "$price", 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const buckets = rows.map((r) => ({
    bucket: r._id,
    count: r.count,
    completedCount: r.completedCount,
    cancelledCount: r.cancelledCount,
    noShowCount: r.noShowCount,
    revenue: r.revenue,
    expectedRevenue: r.expectedRevenue,
  }));

  const totals = buckets.reduce(
    (acc, b) => ({
      count: acc.count + b.count,
      completedCount: acc.completedCount + b.completedCount,
      cancelledCount: acc.cancelledCount + b.cancelledCount,
      noShowCount: acc.noShowCount + b.noShowCount,
      revenue: acc.revenue + b.revenue,
      expectedRevenue: acc.expectedRevenue + b.expectedRevenue,
    }),
    {
      count: 0,
      completedCount: 0,
      cancelledCount: 0,
      noShowCount: 0,
      revenue: 0,
      expectedRevenue: 0,
    }
  );

  return sendSuccess(
    res,
    {
      from: utcToShopDate(rangeStart),
      to: utcToShopDate(addDaysUTC(rangeEnd, -1)),
      groupBy,
      buckets,
      totals,
    },
    "Revenue stats retrieved successfully"
  );
});