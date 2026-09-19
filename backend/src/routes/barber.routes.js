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

import { singleImageUpload } from "../middleware/upload.js";
import { uploadLimiter, adminLimiter, publicLimiter } from "../middleware/rateLimiter.js";

// Public Routes
export const publicBarberRouter = Router();
publicBarberRouter.get("/", publicLimiter, getBarbers);
publicBarberRouter.get("/:id", publicLimiter, getBarberById);

// Admin Routes
export const adminBarberRouter = Router();
adminBarberRouter.get("/", adminLimiter, getBarbers);
adminBarberRouter.get("/:id", adminLimiter, getBarberById);
adminBarberRouter.post("/", adminLimiter, createBarber);
adminBarberRouter.patch("/:id", adminLimiter, updateBarber);
adminBarberRouter.post("/:id/photo", uploadLimiter, singleImageUpload("photo"), uploadBarberPhoto);
adminBarberRouter.delete("/:id", adminLimiter, deleteBarber);
adminBarberRouter.patch("/:id/status", adminLimiter, toggleBarberStatus);
adminBarberRouter.put("/:id/working-hours", adminLimiter, updateWorkingHours);