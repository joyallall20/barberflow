// backend/src/routes/barber.routes.js

import { Router } from "express";

import {
  getBarbers,
  getBarberById,
  createBarber,
  updateBarber,
  deleteBarber,
  toggleBarberStatus,
  updateWorkingHours,
  uploadBarberPhoto,
} from "../controllers/barber.controller.js";

import {
  getBarberPublicReviews,
  getBarberReviewSummary,
} from "../controllers/review.controller.js";

import {
  createReviewQR,
  getReviewQR,
  regenerateReviewQR,
  updateReviewQRStatus,
} from "../controllers/reviewQR.controller.js";

import { singleImageUpload } from "../middleware/upload.js";

import {
  uploadLimiter,
  adminLimiter,
  publicLimiter,
} from "../middleware/rateLimiter.js";

// ======================================================
// PUBLIC BARBER ROUTES
// Mounted at /api/barbers
// ======================================================

export const publicBarberRouter = Router();

publicBarberRouter.get(
  "/",
  publicLimiter,
  getBarbers
);

publicBarberRouter.get(
  "/:id",
  publicLimiter,
  getBarberById
);

publicBarberRouter.get(
  "/:barberId/reviews/summary",
  publicLimiter,
  getBarberReviewSummary
);

publicBarberRouter.get(
  "/:barberId/reviews",
  publicLimiter,
  getBarberPublicReviews
);

// ======================================================
// ADMIN BARBER ROUTES
// Mounted at /api/admin/barbers
//
// Authentication and admin authorization are applied
// by the existing routes/index.js adminGuard.
// ======================================================

export const adminBarberRouter = Router();

// ----------------------
// Barber management
// ----------------------

adminBarberRouter.get(
  "/",
  adminLimiter,
  getBarbers
);

adminBarberRouter.get(
  "/:id",
  adminLimiter,
  getBarberById
);

adminBarberRouter.post(
  "/",
  adminLimiter,
  createBarber
);

adminBarberRouter.patch(
  "/:id",
  adminLimiter,
  updateBarber
);

adminBarberRouter.post(
  "/:id/photo",
  uploadLimiter,
  singleImageUpload("photo"),
  uploadBarberPhoto
);

adminBarberRouter.delete(
  "/:id",
  adminLimiter,
  deleteBarber
);

adminBarberRouter.patch(
  "/:id/status",
  adminLimiter,
  toggleBarberStatus
);

adminBarberRouter.put(
  "/:id/working-hours",
  adminLimiter,
  updateWorkingHours
);

// ----------------------
// Review QR management
// ----------------------

// Create a QR for a barber
adminBarberRouter.post(
  "/:barberId/review-qr",
  adminLimiter,
  createReviewQR
);

// Get QR status and metadata
adminBarberRouter.get(
  "/:barberId/review-qr",
  adminLimiter,
  getReviewQR
);

// Regenerate QR and invalidate the previous token
adminBarberRouter.post(
  "/:barberId/review-qr/regenerate",
  adminLimiter,
  regenerateReviewQR
);

// Activate or deactivate QR
adminBarberRouter.patch(
  "/:barberId/review-qr/status",
  adminLimiter,
  updateReviewQRStatus
);