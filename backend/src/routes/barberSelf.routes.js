// src/routes/barberSelf.routes.js
import { Router } from "express";
import {
  getMyBarberProfile,
  updateMyBarberProfile,
  uploadMyBarberPhoto,
  updateMyWorkingHours,
  getMyAppointments,
  getMyDashboardOverview,
} from "../controllers/barberSelf.controller.js";

import { getMyReviewQR } from "../controllers/reviewQR.controller.js";

import { singleImageUpload } from "../middleware/upload.js";
import { uploadLimiter, apiLimiter } from "../middleware/rateLimiter.js";

const barberSelfRouter = Router();

barberSelfRouter.get("/profile", apiLimiter, getMyBarberProfile);
barberSelfRouter.patch("/profile", apiLimiter, updateMyBarberProfile);
barberSelfRouter.post("/photo", uploadLimiter, singleImageUpload("photo"), uploadMyBarberPhoto);
barberSelfRouter.put("/working-hours", apiLimiter, updateMyWorkingHours);
barberSelfRouter.get("/appointments", apiLimiter, getMyAppointments);
barberSelfRouter.get("/dashboard/overview", apiLimiter, getMyDashboardOverview);

barberSelfRouter.get(
  "/review-qr",
  apiLimiter,
  getMyReviewQR
);

export default barberSelfRouter;