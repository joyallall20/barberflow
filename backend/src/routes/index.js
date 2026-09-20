// routes/index.js
import { Router } from "express";

import protect from "../middleware/auth.js";
import requireAdmin from "../middleware/admin.js";
import requireBarber from "../middleware/barberAuth.js";

// Rate Limiters
import {
  authLimiter,
  appointmentLimiter,
  publicLimiter,
  adminLimiter,
} from "../middleware/rateLimiter.js";

// Named imports for files exporting public/admin split routers
import { publicServiceRouter, adminServiceRouter } from "./service.routes.js";
import { publicBarberRouter, adminBarberRouter } from "./barber.routes.js";
import { publicAppointmentRouter, adminAppointmentRouter } from "./appointment.routes.js";
import { publicPaymentRouter, adminPaymentRouter } from "./payment.routes.js";
import { publicRefundRouter, adminRefundRouter } from "./refund.routes.js";

// Default imports for files exporting a single router instance directly
import customerRouter from "./customer.routes.js";
import dashboardRouter from "./dashboard.routes.js";
import blockedTimeRouter from "./blockedTime.routes.js";
import recurringBlockedTimeRouter from "./recurringBlockedTime.routes.js";
import availabilityRouter from "./availability.routes.js";
import barberSelfRouter from "./barberSelf.routes.js";

// Self-service auth endpoints (existing controller)
import { syncMe, getMe } from "../controllers/customer.controller.js";

const router = Router();

/* ------------------------------------------------------------------ */
/* Guards (declared BEFORE any router.use that references them)       */
/* ------------------------------------------------------------------ */
const adminGuard = [protect, requireAdmin];
const barberGuard = [protect, requireBarber];

/* ------------------------------------------------------------------ */
/* Health                                                             */
/* ------------------------------------------------------------------ */
router.get("/health", (req, res) => {
  res.json({ success: true, message: "API is healthy" });
});

/* ------------------------------------------------------------------ */
/* Self-service Auth                                                  */
/* (any authenticated user, operates on own account)                  */
/* ------------------------------------------------------------------ */
router.post("/me/sync", authLimiter, protect, syncMe);
router.get("/me", authLimiter, protect, getMe);

/* ------------------------------------------------------------------ */
/* Public Routes                                                      */
/* ------------------------------------------------------------------ */
router.use("/services", publicServiceRouter);
router.use("/barbers", publicBarberRouter);
router.use("/appointments", publicAppointmentRouter);
router.use("/availability", publicLimiter, availabilityRouter);

/* ------------------------------------------------------------------ */
/* Payment & Refund Routes (auth handled inside each router)          */
/* ------------------------------------------------------------------ */
router.use("/payments", publicPaymentRouter);
router.use("/refunds", publicRefundRouter);

/* ------------------------------------------------------------------ */
/* Barber Self-Service Routes (Guarded by protect + requireBarber)   */
/* ------------------------------------------------------------------ */
router.use("/barber", barberGuard, barberSelfRouter);

/* ------------------------------------------------------------------ */
/* Admin Routes (Guarded by protect + requireAdmin)                   */
/* ------------------------------------------------------------------ */
router.use("/admin/services", adminGuard, adminServiceRouter);
router.use("/admin/barbers", adminGuard, adminBarberRouter);
router.use("/admin/appointments", adminGuard, adminAppointmentRouter);
router.use("/admin/customers", adminGuard, customerRouter);
router.use("/admin/dashboard", adminGuard, dashboardRouter);
router.use("/admin/blocked-times", adminGuard, blockedTimeRouter);
router.use("/admin/recurring-blocked-times", adminGuard, recurringBlockedTimeRouter);

// Payment & refund admin routes
router.use("/admin/payments", adminGuard, adminPaymentRouter);
router.use("/admin/refunds", adminGuard, adminRefundRouter);

/* ------------------------------------------------------------------ */
/* Fallback 404 Handler                                               */
/* ------------------------------------------------------------------ */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

export default router;