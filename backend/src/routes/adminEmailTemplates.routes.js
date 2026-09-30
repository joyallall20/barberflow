import { Router } from "express";

import {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
} from "../controllers/adminEmailTemplates.controller.js";

const router = Router();

// Get all email templates
router.get("/", getEmailTemplates);

// Get one template by type
router.get("/:type", getEmailTemplate);

// Update one template by type
router.patch("/:type", updateEmailTemplate);

export default router;