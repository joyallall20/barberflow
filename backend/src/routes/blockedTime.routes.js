import { Router } from "express";

import {
  createBlockedTime,
  getBlockedTimes,
  getBlockedTimeById,
  updateBlockedTime,
  deleteBlockedTime,
} from "../controllers/blockedTime.controller.js";

const adminRouter = Router();

adminRouter.get("/", getBlockedTimes);
adminRouter.get("/:id", getBlockedTimeById);
adminRouter.post("/", createBlockedTime);
adminRouter.patch("/:id", updateBlockedTime);
adminRouter.delete("/:id", deleteBlockedTime);

// ✅ FIX: Export adminRouter directly as default
export default adminRouter;