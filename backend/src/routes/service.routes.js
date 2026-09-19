import { Router } from "express";

import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
} from "../controllers/service.controller.js";

// Public Routes
export const publicServiceRouter = Router();
publicServiceRouter.get("/", getServices);
publicServiceRouter.get("/:id", getServiceById);

// Admin Routes
export const adminServiceRouter = Router();
adminServiceRouter.get("/", getServices);
adminServiceRouter.get("/:id", getServiceById);
adminServiceRouter.post("/", createService);
adminServiceRouter.patch("/:id", updateService);
adminServiceRouter.delete("/:id", deleteService);
adminServiceRouter.patch("/:id/status", toggleServiceStatus);