// controllers/review.controller.js
import mongoose from "mongoose";
import { z } from "zod";

import Review from "../models/Review.js";
import Appointment from "../models/Appointment.js";
import Customer from "../models/Customer.js";
import Barber from "../models/Barber.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const REVIEW_STATUSES = ["pending", "approved", "rejected"];
const REVIEW_SOURCES = ["qr", "email", "website"];

const PUBLIC_BARBER_SELECT = "name photo";
const PUBLIC_CUSTOMER_SELECT = "name";

// Populate shape used for admin moderation responses.
const ADMIN_POPULATE_PATHS = [
  { path: "customer", select: "name email phone" },
  { path: "barber", select: "name photo" },
  {
    path: "appointment",
    select: "date startTime endTime status paymentStatus service",
    populate: { path: "service", select: "name price duration" },
  },
];

// Populate shape used for public barber-review responses.
const PUBLIC_POPULATE_PATHS = [
  { path: "customer", select: PUBLIC_CUSTOMER_SELECT },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ensureObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

const isAdminOrOwner = (req) =>
  req.user?.role === "admin" || req.user?.role === "owner";

/**
 * Resolve the authenticated user's Customer document.
 *
 * Mirrors the existing pattern in appointment.controller.js
 * (getMyCustomerAppointments / cancelMyCustomerAppointment):
 * match on userId OR normalized email. Never trust req.body.customer.
 */

const requireCustomerProfile = async (req) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "customer") {
    throw new ApiError(403, "Only customers can submit reviews");
  }

  const userId = req.user.mongoId;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(401, "Invalid authenticated user");
  }

  // 1. Find the customer profile linked to this authenticated User.
  let customer = await Customer.findOne({ userId });

  if (customer) {
    if (!customer.active) {
      throw new ApiError(403, "Customer profile is inactive");
    }

    return customer;
  }

  // 2. Legacy fallback:
  // Only match an email-based profile that has not been linked
  // to another authenticated User.
  const email = req.user.email?.toLowerCase().trim();

  if (!email) {
    throw new ApiError(404, "Customer profile not found");
  }

  customer = await Customer.findOne({
    email,
    userId: null,
  });

  if (!customer) {
    throw new ApiError(404, "Customer profile not found");
  }

  if (!customer.active) {
    throw new ApiError(403, "Customer profile is inactive");
  }

  // 3. Link this legacy profile to the authenticated User.
  customer.userId = userId;
  await customer.save();

  return customer;
};

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const createReviewSchema = z
  .object({
    appointment: z.string().regex(OBJECT_ID_REGEX, "Invalid appointment ID"),
    barber: z.string().regex(OBJECT_ID_REGEX, "Invalid barber ID"),
    rating: z
      .number()
      .int("Rating must be a whole number")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating must be at most 5"),
    comment: z.string().trim().max(2000).optional().default(""),
    source: z.enum(REVIEW_SOURCES),
  })
  .strict(); // reject any attempt to smuggle customer/status/etc.

const listPublicReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listAdminReviewsQuerySchema = z.object({
  status: z.enum(REVIEW_STATUSES).optional(),
  barber: z.string().regex(OBJECT_ID_REGEX).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  source: z.enum(REVIEW_SOURCES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/* ------------------------------------------------------------------ */
/* Controllers                                                         */
/* ------------------------------------------------------------------ */

/**
 * POST /api/reviews
 *
 * Customer creates a review for their own completed appointment.
 */
export const createReview = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(createReviewSchema, req.body);

  const customer = await requireCustomerProfile(req);

  const appointment = await Appointment.findById(payload.appointment);
  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  // Ownership: appointment must belong to the authenticated customer.
  if (String(appointment.customer) !== String(customer._id)) {
    throw new ApiError(403, "You are not authorized to review this appointment");
  }

  // Only completed appointments may be reviewed.
  if (appointment.status !== "completed") {
    throw new ApiError(
      409,
      `Cannot review an appointment with status "${appointment.status}"`
    );
  }

  // The review's barber must match the appointment's barber.
  if (String(appointment.barber) !== String(payload.barber)) {
    throw new ApiError(403, "Barber does not match the appointment");
  }

  // Application-level duplicate guard (DB unique index is the second layer).
  const existing = await Review.findOne({ appointment: appointment._id });
  if (existing) {
    throw new ApiError(409, "A review for this appointment already exists");
  }

  let review;
  try {
    review = await Review.create({
      customer: customer._id,          // server-derived
      barber: appointment.barber,      // server-derived from appointment
      appointment: appointment._id,    // server-derived
      rating: payload.rating,
      comment: payload.comment || "",
      source: payload.source,
      status: "pending",               // always starts pending
    });
  } catch (err) {
    // Graceful handling of the DB unique index on `appointment`.
    if (err.code === 11000) {
      throw new ApiError(409, "A review for this appointment already exists");
    }
    throw err;
  }

  await review.populate([
    { path: "barber", select: PUBLIC_BARBER_SELECT },
    { path: "customer", select: PUBLIC_CUSTOMER_SELECT },
  ]);

  return sendCreated(res, review, "Review submitted successfully");
});

/**
 * GET /api/barbers/:barberId/reviews
 *
 * Public: approved reviews for a barber only.
 */
export const getBarberPublicReviews = asyncHandler(async (req, res) => {
  const { barberId } = req.params;
  ensureObjectId(barberId, "barber ID");

  const { page, limit } = parseOrThrow(
    listPublicReviewsQuerySchema,
    req.query
  );

  const filter = { barber: barberId, status: "approved" };
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(PUBLIC_POPULATE_PATHS),
    Review.countDocuments(filter),
  ]);

  // Strip anything not intended for public consumption.
  const sanitized = reviews.map((r) => {
    const obj = r.toObject();
    delete obj.appointment;
    return obj;
  });

  return sendSuccess(
    res,
    { reviews: sanitized, total, page, limit },
    "Barber reviews retrieved successfully"
  );
});

/**
 * GET /api/barbers/:barberId/reviews/summary
 *
 * Public: aggregate stats over approved reviews only.
 */
export const getBarberReviewSummary = asyncHandler(async (req, res) => {
  const { barberId } = req.params;
  ensureObjectId(barberId, "barber ID");

  const match = { barber: new mongoose.Types.ObjectId(barberId), status: "approved" };

  const [agg] = await Review.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        average: { $avg: "$rating" },
        r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]);

  const total = agg?.total || 0;
  const average =
    agg && agg.average != null
      ? Math.round(agg.average * 10) / 10 // 1 decimal place
      : 0;

  const distribution = {
    1: agg?.r1 || 0,
    2: agg?.r2 || 0,
    3: agg?.r3 || 0,
    4: agg?.r4 || 0,
    5: agg?.r5 || 0,
  };

  return sendSuccess(
    res,
    { total, average, distribution },
    "Barber review summary retrieved successfully"
  );
});

/**
 * GET /api/admin/reviews
 *
 * Admin/owner: list reviews for moderation with filters.
 * (Route is expected to be guarded by requireAdmin.)
 */
export const listAdminReviews = asyncHandler(async (req, res) => {
  const { status, barber, rating, source, page, limit } = parseOrThrow(
    listAdminReviewsQuerySchema,
    req.query
  );

  const filter = {};
  if (status) filter.status = status;
  if (barber) filter.barber = barber;
  if (rating) filter.rating = rating;
  if (source) filter.source = source;

  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(ADMIN_POPULATE_PATHS),
    Review.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    { reviews, total, page, limit },
    "Reviews retrieved successfully"
  );
});

/**
 * PATCH /api/admin/reviews/:id/approve
 */
export const approveReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "review ID");

  const review = await Review.findById(id);
  if (!review) throw new ApiError(404, "Review not found");

  if (review.status === "approved") {
    return sendSuccess(res, review, "Review already approved");
  }

  review.status = "approved";
  await review.save();
  await review.populate(ADMIN_POPULATE_PATHS);

  return sendSuccess(res, review, "Review approved successfully");
});

/**
 * PATCH /api/admin/reviews/:id/reject
 */
export const rejectReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "review ID");

  const review = await Review.findById(id);
  if (!review) throw new ApiError(404, "Review not found");

  if (review.status === "rejected") {
    return sendSuccess(res, review, "Review already rejected");
  }

  review.status = "rejected";
  await review.save();
  await review.populate(ADMIN_POPULATE_PATHS);

  return sendSuccess(res, review, "Review rejected successfully");
});

/**
 * DELETE /api/admin/reviews/:id
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "review ID");

  const review = await Review.findById(id);
  if (!review) throw new ApiError(404, "Review not found");

  const reviewId = review._id;
  await review.deleteOne();

  return sendSuccess(res, { id: reviewId }, "Review deleted successfully");
});

/**
 * GET /api/reviews/eligible-appointments?barberId=...
 *
 * Authenticated customer: return their completed appointments
 * with this barber that do not already have a review.
 */
export const getEligibleReviewAppointments = asyncHandler(
  async (req, res) => {
    const { barberId } = req.query;

    if (!barberId || typeof barberId !== "string") {
      throw new ApiError(400, "Barber ID is required");
    }

    ensureObjectId(barberId, "barber ID");

    const customer = await requireCustomerProfile(req);

    const barberExists = await Barber.exists({
      _id: barberId,
      active: true,
    });

    if (!barberExists) {
      throw new ApiError(404, "Barber not found or inactive");
    }

    // Find all appointment IDs that already have a review.
    const reviewedAppointmentIds = await Review.distinct(
      "appointment",
      { customer: customer._id }
    );

    const appointments = await Appointment.find({
      customer: customer._id,
      barber: barberId,
      status: "completed",
      _id: { $nin: reviewedAppointmentIds },
    })
      .select(
        "date startTime endTime status paymentStatus service barber"
      )
      .sort({ date: -1, startTime: -1 })
      .populate("service", "name price duration")
      .populate("barber", "name photo")
      .lean();

    return sendSuccess(
      res,
      { appointments },
      "Eligible review appointments retrieved successfully"
    );
  }
);