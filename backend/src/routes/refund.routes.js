// src/routes/refund.routes.js
import { Router } from "express";

import {
  createRefund,
  completeRefund,
  failRefund,
  getRefunds,
  getRefundById,
  getRefundsByPayment,
  updateRefund,
  deleteRefund,
  getRefundStats,
} from "../controllers/refund.controller.js";

import protect from "../middleware/auth.js";
import requireAdmin from "../middleware/admin.js";
import { adminLimiter } from "../middleware/rateLimiter.js";

/* ------------------------------------------------------------------ */
/* Public (authenticated) refund router                                */
/* Mounted at: /api/refunds                                            */
/* Customers may view refunds for their own payments                   */
/* ------------------------------------------------------------------ */
export const publicRefundRouter = Router();

publicRefundRouter.use(protect);

// Customers can look up refunds tied to a payment they own.
// Ownership check should live in the controller.
publicRefundRouter.get("/payment/:paymentId", getRefundsByPayment);

// Single refund detail (ownership enforced in controller)
publicRefundRouter.get("/:id", getRefundById);

/* ------------------------------------------------------------------ */
/* Admin refund router                                                 */
/* Mounted at: /api/admin/refunds (behind adminGuard at parent)       */
/* ------------------------------------------------------------------ */
export const adminRefundRouter = Router();

adminRefundRouter.use(protect, requireAdmin, adminLimiter);

// Stats first, before /:id
adminRefundRouter.get("/stats", getRefundStats);

// List
adminRefundRouter.get("/", getRefunds);

// Admin lookups
adminRefundRouter.get("/payment/:paymentId", getRefundsByPayment);
adminRefundRouter.get("/:id", getRefundById);

// Create + transitions
adminRefundRouter.post("/", createRefund);
adminRefundRouter.patch("/:id/complete", completeRefund);
adminRefundRouter.patch("/:id/fail", failRefund);

// Update / delete (delete blocked for completed refunds in controller)
adminRefundRouter.put("/:id", updateRefund);
adminRefundRouter.delete("/:id", deleteRefund);