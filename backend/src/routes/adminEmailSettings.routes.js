import { Router } from "express";

import {
  getEmailSettings,
  updateEmailSettings,
} from "../controllers/adminEmailSettings.controller.js";

const router = Router();

router.get("/", getEmailSettings);
router.patch("/", updateEmailSettings);

export default router;