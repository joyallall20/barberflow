// src/services/barberLink.service.js
import mongoose from "mongoose";
import Barber from "../models/Barber.js";
import User from "../models/User.js";

/**
 * Transactional Barber Account Claim Service
 *
 * Rules:
 * - Email must match an active Barber profile (case-insensitive, normalized).
 * - Barber profile must be UNCLAIMED (userId is null/missing) OR already claimed by this exact User (self-healing retry).
 * - A Barber profile claimed by ANOTHER user (userId !== userDoc._id) can NEVER be reassigned.
 * - Under concurrent requests, atomic `findOneAndUpdate` + Mongoose transaction ensures exactly ONE User can claim the Barber profile.
 * - Bypasses Mongoose schema `role` immutability via MongoDB driver collection update, strictly within this trusted backend service.
 *
 * @param {Object} userDoc - Mongoose User document
 * @param {string} email - Verified email address from Firebase token
 * @returns {Promise<{ linked: boolean, barber: Object|null }>}
 */
export const tryClaimBarberAccount = async (userDoc, email) => {
  if (!userDoc || !email) return { linked: false, barber: null };

  const safeEmail = email.trim().toLowerCase();

  // If user is already linked to a Barber profile, return existing link
  if (userDoc.role === "barber" && userDoc.barberId) {
    const existingBarber = await Barber.findById(userDoc.barberId);
    if (existingBarber && existingBarber.active) {
      return { linked: true, barber: existingBarber };
    }
  }

  const session = await mongoose.startSession();

  try {
    let claimedBarber = null;

    // Use MongoDB transaction to ensure Barber.userId and User.barberId/User.role commit together atomically
    await session.withTransaction(async () => {
      // 1. Find and update the active Barber profile atomically.
      // Match condition allows claiming if unclaimed (userId null/missing) OR if already linked to this exact User (self-healing).
      const barber = await Barber.findOneAndUpdate(
        {
          email: safeEmail,
          active: true,
          $or: [
            { userId: null },
            { userId: { $exists: false } },
            { userId: userDoc._id },
          ],
        },
        {
          $set: { userId: userDoc._id },
        },
        { returnDocument: "after", session }
      );

      if (!barber) {
        return; // No eligible unclaimed barber found
      }

      // 2. Update User collection directly to set role="barber" and barberId
      // Collection driver update bypasses Mongoose schema-level immutable:true safely inside trusted server-side flow
      await User.collection.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            role: "barber",
            barberId: barber._id,
          },
        },
        { session }
      );

      claimedBarber = barber;
    });

    if (!claimedBarber) {
      return { linked: false, barber: null };
    }

    // Update in-memory userDoc instance
    userDoc.role = "barber";
    userDoc.barberId = claimedBarber._id;

    return { linked: true, barber: claimedBarber };
  } catch (error) {
    // Fallback for non-replica set MongoDB environments (standalone local dev)
    if (
      error.message?.includes("Transaction numbers are only allowed") ||
      error.message?.includes("replica set")
    ) {
      return executeNonTransactionalClaim(userDoc, safeEmail);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Non-transactional fallback for standalone MongoDB instances without replica set support.
 */
const executeNonTransactionalClaim = async (userDoc, safeEmail) => {
  const barber = await Barber.findOneAndUpdate(
    {
      email: safeEmail,
      active: true,
      $or: [
        { userId: null },
        { userId: { $exists: false } },
        { userId: userDoc._id },
      ],
    },
    {
      $set: { userId: userDoc._id },
    },
    { returnDocument: "after" }
  );

  if (!barber) {
    return { linked: false, barber: null };
  }

  await User.collection.updateOne(
    { _id: userDoc._id },
    {
      $set: {
        role: "barber",
        barberId: barber._id,
      },
    }
  );

  userDoc.role = "barber";
  userDoc.barberId = barber._id;

  return { linked: true, barber };
};
