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

import { singleImageUpload } from "../middleware/upload.js";
import { uploadLimiter, apiLimiter } from "../middleware/rateLimiter.js";

const barberSelfRouter = Router();

barberSelfRouter.get("/profile", apiLimiter, getMyBarberProfile);
barberSelfRouter.patch("/profile", apiLimiter, updateMyBarberProfile);
barberSelfRouter.post("/photo", uploadLimiter, singleImageUpload("photo"), uploadMyBarberPhoto);
barberSelfRouter.put("/working-hours", apiLimiter, updateMyWorkingHours);
barberSelfRouter.get("/appointments", apiLimiter, getMyAppointments);
barberSelfRouter.get("/dashboard/overview", apiLimiter, getMyDashboardOverview);

export default barberSelfRouter;
