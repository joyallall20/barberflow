
import { Router } from "express";

import {
  createReview,
  getEligibleReviewAppointments,
  getBarberPublicReviews,
  getBarberReviewSummary,
  listAdminReviews,
  approveReview,
  rejectReview,
  deleteReview,
} from "../controllers/review.controller.js";

import {
  resolveReviewQR,
} from "../controllers/reviewQR.controller.js";

import {
  publicLimiter,
  adminLimiter,
} from "../middleware/rateLimiter.js";

import protect from "../middleware/auth.js";

export const publicReviewRouter = Router();
export const adminReviewRouter = Router();

// ============================================
// PUBLIC REVIEW ROUTES
// Mounted at /api/reviews
// ============================================

// Resolve QR token to barber information
publicReviewRouter.get(
  "/qr/:token",
  publicLimiter,
  resolveReviewQR
);

// Get completed appointments eligible for review
// Requires customer authentication
publicReviewRouter.get(
  "/eligible-appointments",
  publicLimiter,
  protect,
  getEligibleReviewAppointments
);

// Submit a review
publicReviewRouter.post(
  "/",
  publicLimiter,
  protect,
  createReview
);

// ============================================
// ADMIN REVIEW ROUTES
// Mounted at /api/admin/reviews
// ============================================

// List reviews for moderation
adminReviewRouter.get(
  "/",
  adminLimiter,
  listAdminReviews
);

// Approve review
adminReviewRouter.patch(
  "/:id/approve",
  adminLimiter,
  approveReview
);

// Reject review
adminReviewRouter.patch(
  "/:id/reject",
  adminLimiter,
  rejectReview
);

// Delete review
adminReviewRouter.delete(
  "/:id",
  adminLimiter,
  deleteReview
);