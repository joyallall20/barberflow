import { Router } from "express";

import {
  createRecurringBlockedTime,
  getRecurringBlockedTimes,
  getRecurringBlockedTimeById,
  updateRecurringBlockedTime,
  deleteRecurringBlockedTime,
} from "../controllers/recurringBlockedTime.controller.js";

const adminRouter = Router();

adminRouter.get("/", getRecurringBlockedTimes);
adminRouter.get("/:id", getRecurringBlockedTimeById);
adminRouter.post("/", createRecurringBlockedTime);
adminRouter.patch("/:id", updateRecurringBlockedTime);
adminRouter.delete("/:id", deleteRecurringBlockedTime);

export default adminRouter;
