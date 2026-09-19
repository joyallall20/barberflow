import { Router } from "express";

import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  cancelAppointment,
  confirmAppointment,
  completeAppointment,
  markNoShow,
  rescheduleAppointment,
  getMyCustomerAppointments,
  cancelMyCustomerAppointment,
} from "../controllers/appointment.controller.js";

import protect from "../middleware/auth.js";
import { appointmentLimiter, adminLimiter, apiLimiter } from "../middleware/rateLimiter.js";

// Public / Authenticated Customer Routes
export const publicAppointmentRouter = Router();

publicAppointmentRouter.post("/", appointmentLimiter, createAppointment);
publicAppointmentRouter.get("/my", apiLimiter, protect, getMyCustomerAppointments);
publicAppointmentRouter.patch("/my/:id/cancel", apiLimiter, protect, cancelMyCustomerAppointment);

// Admin / Staff Routes
export const adminAppointmentRouter = Router();

adminAppointmentRouter.get("/", adminLimiter, getAppointments);
adminAppointmentRouter.get("/:id", adminLimiter, getAppointmentById);
adminAppointmentRouter.patch("/:id", adminLimiter, updateAppointment);
adminAppointmentRouter.patch("/:id/confirm", adminLimiter, confirmAppointment);
adminAppointmentRouter.patch("/:id/complete", adminLimiter, completeAppointment);
adminAppointmentRouter.patch("/:id/no-show", adminLimiter, markNoShow);
adminAppointmentRouter.patch("/:id/cancel", adminLimiter, cancelAppointment);
adminAppointmentRouter.patch("/:id/reschedule", adminLimiter, rescheduleAppointment);
adminAppointmentRouter.delete("/:id", adminLimiter, deleteAppointment);