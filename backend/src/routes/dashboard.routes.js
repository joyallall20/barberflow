import { Router } from "express";

import {
  getDashboardOverview,
  getTodayAppointments,
  getUpcomingAppointments,
  getWeeklyStats,
  getRevenueStats,
} from "../controllers/dashboard.controller.js";

const adminRouter = Router();

adminRouter.get("/overview", getDashboardOverview);
adminRouter.get("/today", getTodayAppointments);
adminRouter.get("/upcoming", getUpcomingAppointments);
adminRouter.get("/weekly", getWeeklyStats);
adminRouter.get("/revenue", getRevenueStats);

// ✅ FIX: Export adminRouter directly
export default adminRouter;