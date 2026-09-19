import { Router } from "express";

import {
  getCustomers,
  getCustomerById,
  updateCustomer,
} from "../controllers/customer.controller.js";

const adminRouter = Router();
adminRouter.get("/", getCustomers);
adminRouter.get("/:id", getCustomerById);
adminRouter.patch("/:id", updateCustomer);

// ✅ FIX: Export the Router instance directly
export default adminRouter;