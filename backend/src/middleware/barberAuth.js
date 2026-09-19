// src/middleware/barberAuth.js
import Barber from "../models/Barber.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Authorization middleware for Barber-only routes.
 *
 * Checks:
 * 1. Authenticated user exists (`req.user`)
 * 2. User role is 'barber'
 * 3. User account is active (`active: true`)
 * 4. User is linked to a Barber profile (`barberId` exists)
 * 5. Linked Barber profile exists and is active (`active: true`)
 *
 * Attaches `req.barber` to the request for downstream controllers.
 */
export const requireBarber = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "barber") {
    throw new ApiError(403, "Access denied. Barber authorization required.");
  }

  if (req.user.active !== true) {
    throw new ApiError(403, "User account is inactive");
  }

  // Fetch full User document to get barberId if not on req.user
  let barberId = req.user.barberId;
  if (!barberId && req.user.mongoId) {
    const userDoc = await User.findById(req.user.mongoId).select("barberId active role");
    if (userDoc) barberId = userDoc.barberId;
  }

  if (!barberId) {
    throw new ApiError(
      403,
      "Barber account is not linked to a valid Barber profile"
    );
  }

  const barber = await Barber.findById(barberId);

  if (!barber) {
    throw new ApiError(404, "Linked Barber profile not found");
  }

  if (!barber.active) {
    throw new ApiError(
      403,
      "Barber profile is currently deactivated. Access denied."
    );
  }

  // Attach verified barber profile to request (prevents IDOR)
  req.barber = barber;

  next();
});

export default requireBarber;
