import { Router } from "express";
import { getAvailability } from "../controllers/availability.controller.js";

const router = Router();

// GET /api/availability?barber=ID&service=ID&date=YYYY-MM-DD
router.get("/", getAvailability);

export default router;