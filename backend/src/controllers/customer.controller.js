// controllers/customer.controller.js
import mongoose from "mongoose";
import { z } from "zod";

import Customer from "../models/Customer.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { parseOrThrow } from "../utils/validate.js";
import Barber from "../models/Barber.js";
import Service from "../models/Service.js";
import { tryClaimBarberAccount } from "../services/barberLink.service.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const ensureObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

const validatePreferences = async ({ preferredBarber, preferredService }) => {
  if (preferredBarber) {
    const barber = await Barber.findById(preferredBarber).select("_id active");

    if (!barber) {
      throw new ApiError(404, "Preferred barber not found");
    }

    if (!barber.active) {
      throw new ApiError(409, "Preferred barber is inactive");
    }
  }

  if (preferredService) {
    const service = await Service.findById(preferredService).select(
      "_id active"
    );

    if (!service) {
      throw new ApiError(404, "Preferred service not found");
    }

    if (!service.active) {
      throw new ApiError(409, "Preferred service is inactive");
    }
  }
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: z.enum(["true", "false"]).optional(),
});

const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(200).optional(),
    phone: z.string().trim().min(7).max(30).optional(),
    preferredBarber: z.string().regex(OBJECT_ID_REGEX).nullable().optional(),
    preferredService: z.string().regex(OBJECT_ID_REGEX).nullable().optional(),
    notes: z.string().trim().max(1000).optional(),
    active: z.boolean().optional(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Controllers                                                         */
/* ------------------------------------------------------------------ */

export const getCustomers = asyncHandler(async (req, res) => {
  const { search, page, limit, active } = parseOrThrow(
    listQuerySchema,
    req.query
  );

  const filter = {};
  if (typeof active !== "undefined") filter.active = active === "true";

  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("preferredBarber", "name photo")
      .populate("preferredService", "name price duration"),
    Customer.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    { customers, total, page, limit },
    "Customers retrieved successfully"
  );
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "customer ID");

  const customer = await Customer.findById(id)
    .populate("preferredBarber", "name photo")
    .populate("preferredService", "name price duration");

  if (!customer) throw new ApiError(404, "Customer not found");

  const appointments = await Appointment.find({ customer: customer._id })
    .sort({ date: -1, startTime: -1 })
    .populate("barber", "name photo")
    .populate("service", "name price duration");

  return sendSuccess(
    res,
    { customer, appointments },
    "Customer retrieved successfully"
  );
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureObjectId(id, "customer ID");

  const data = parseOrThrow(updateCustomerSchema, req.body);

  if (data.email) data.email = data.email.toLowerCase().trim();
  if (data.phone) data.phone = String(data.phone).replace(/\D/g, "");

  await validatePreferences({
    preferredBarber: data.preferredBarber,
    preferredService: data.preferredService,
  });

  const customer = await Customer.findById(id);
  if (!customer) throw new ApiError(404, "Customer not found");

  Object.assign(customer, data);
  await customer.save();

  return sendSuccess(res, customer, "Customer updated successfully");
});

/* ------------------------------------------------------------------ */
/* Auth — self-service endpoints (called by the frontend auth flow)    */
/* ------------------------------------------------------------------ */

/**
 * POST /api/me/sync
 *
 * Idempotent upsert of the caller's auth identity + customer record.
 * Runs behind `protect`, so `req.user` is the verified Firebase token
 * payload (uid, name, email).
 *
 * Rules:
 * - firebaseUid comes from the verified token, never from the body.
 * - role is "customer" on create. Never overwritten on update.
 * - active defaults to true on create. Never overwritten on update.
 * - Creates or links a Customer row keyed on email.
 */
export const syncMe = asyncHandler(async (req, res) => {
  const { uid, name, email } = req.user || {};

  if (!uid) throw new ApiError(401, "Missing Firebase identity");
  if (!email) throw new ApiError(400, "Firebase account has no email");

  const safeName = (name && String(name).trim()) || email.split("@")[0];
  const safeEmail = String(email).toLowerCase().trim();

  // 1) Upsert the auth User
  let user = await User.findOne({ firebaseUid: uid });

  if (user) {
    let dirty = false;
    if (safeName !== user.name) {
      user.name = safeName;
      dirty = true;
    }
    if (safeEmail !== user.email) {
      user.email = safeEmail;
      dirty = true;
    }
    if (dirty) await user.save();
  } else {
    try {
      user = await User.create({
        firebaseUid: uid,
        name: safeName,
        email: safeEmail,
        role: "customer",
        active: true,
      });
    } catch (err) {
      if (err?.code === 11000) {
        user = await User.findOne({ firebaseUid: uid });
      } else {
        throw err;
      }
    }
  }

  if (!user) throw new ApiError(500, "Unable to sync user account");

  // 2) Check if this user email matches an unclaimed active Barber profile
  const claimResult = await tryClaimBarberAccount(user, safeEmail);

  // 3) Link or create a Customer row ONLY for role "customer".
  //    Barbers, Admins, Owners don't need a Customer row.
  if (user.role === "customer" && !claimResult.linked) {
    const existingCustomer = await Customer.findOne({
      email: safeEmail,
    }).select("_id userId");

    if (existingCustomer) {
      if (!existingCustomer.userId) {
        existingCustomer.userId = user._id;
        await existingCustomer.save();
      }
    } else {
      try {
        await Customer.create({
          userId: user._id,
          name: safeName,
          email: safeEmail,
          phone: "",
          active: true,
        });
      } catch (err) {
        if (err?.code !== 11000) throw err;
      }
    }
  }

  return sendSuccess(
    res,
    {
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      barberId: user.barberId || null,
    },
    "User synced"
  );
});

/**
 * GET /api/me
 *
 * Returns the caller's auth identity.
 * `protect` already attached name/email/role/active to req.user.
 */
export const getMe = asyncHandler(async (req, res) => {
  const { name, email, role, active, barberId } = req.user || {};

  if (!email || !role) {
    throw new ApiError(403, "User account is not authorized");
  }

  return sendSuccess(
    res,
    { name, email, role, active, barberId: barberId || null },
    "User retrieved"
  );
});