// src/routes/payment.routes.js
import { Router } from "express";

import {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentByOrderId,
  updatePayment,
  updatePaymentStatus,
  refundPayment,
  deletePayment,
  getPaymentStats,
  capturePayment,
} from "../controllers/payment.controller.js";

import protect from "../middleware/auth.js";
import requireAdmin from "../middleware/admin.js";
import { appointmentLimiter, adminLimiter } from "../middleware/rateLimiter.js";

/* ------------------------------------------------------------------ */
/* Public (authenticated) payment router                              */
/* Mounted at: /api/payments                                          */
/* Used by customers during checkout                                   */
/* ------------------------------------------------------------------ */
export const publicPaymentRouter = Router();

publicPaymentRouter.use(protect);

// Create a payment record (usually right after PayPal order creation)
publicPaymentRouter.post("/", appointmentLimiter, createPayment);

// Fetch by PayPal order id (used by frontend polling after redirect)
publicPaymentRouter.get("/order/:orderId", getPaymentByOrderId);

// Capture a PayPal payment (customer finalizes payment)
publicPaymentRouter.post("/:id/capture", appointmentLimiter, capturePayment);

// Fetch a single payment (owner or admin — enforce ownership in controller if needed)
publicPaymentRouter.get("/:id", getPaymentById);
/* ------------------------------------------------------------------ */
/* Admin payment router                                                */
/* Mounted at: /api/admin/payments (behind adminGuard at parent)      */
/* ------------------------------------------------------------------ */
export const adminPaymentRouter = Router();

adminPaymentRouter.use(protect, requireAdmin, adminLimiter);

// Stats must come before /:id to avoid "stats" being parsed as an id
adminPaymentRouter.get("/stats", getPaymentStats);

// List with filters + pagination
adminPaymentRouter.get("/", getPayments);

// Update / status / refund / delete
adminPaymentRouter.put("/:id", updatePayment);
adminPaymentRouter.patch("/:id/status", updatePaymentStatus);
adminPaymentRouter.post("/:id/refund", refundPayment);
adminPaymentRouter.delete("/:id", deletePayment);

// (Optional) Fetch a single payment as admin — same controller, no ownership check
adminPaymentRouter.get("/:id", getPaymentById);