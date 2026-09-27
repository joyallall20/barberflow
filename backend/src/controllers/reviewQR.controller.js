// backend/src/controllers/reviewQR.controller.js

import crypto from "crypto";
import mongoose from "mongoose";

import Barber from "../models/Barber.js";
import ReviewQR from "../models/ReviewQR.js";

/**
 * Generate a cryptographically secure public identifier for a QR.
 * This ID is permanent and safe to expose in URLs.
 */
const generatePublicId = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Legacy helper: hash a raw token the same way the previous
 * controller did, so already-printed QR codes keep resolving
 * during the migration window.
 */
const hashLegacyToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Build the permanent public review URL from a publicId.
 * Requires FRONTEND_URL to be configured.
 */
const getPublicReviewUrl = (publicId) => {
  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not configured");
  }

  const baseUrl = frontendUrl.replace(/\/+$/, "");

  return `${baseUrl}/review/qr/${publicId}`;
};

/**
 * Ensure an existing QR record has a permanent publicId.
 *
 * Legacy QR records may have only tokenHash.
 * Preserve tokenHash so previously printed QR codes continue working.
 */
const ensurePermanentPublicId = async (reviewQR) => {
  if (reviewQR.publicId) {
    return reviewQR.publicId;
  }

  const publicId = generatePublicId();

  // Use a conditional database update so concurrent requests
  // cannot overwrite an ID that another request has assigned.
  await ReviewQR.collection.updateOne(
    {
      _id: reviewQR._id,
      $or: [
        { publicId: { $exists: false } },
        { publicId: null },
      ],
    },
    {
      $set: { publicId },
    }
  );

  // Read the persisted value in case another request won the race.
  const updatedQR = await ReviewQR.findById(reviewQR._id)
    .select("+tokenHash barber active publicId");

  if (!updatedQR?.publicId) {
    throw new Error("Failed to assign permanent QR identifier");
  }

  reviewQR.publicId = updatedQR.publicId;

  return updatedQR.publicId;
};

/**
 * Validate MongoDB ObjectId.
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * POST /api/admin/barbers/:barberId/review-qr
 *
 * Create a QR token for a barber.
 *
 * Security:
 * - Stores a permanent publicId (not a secret).
 * - Returns the same publicUrl on every fetch.
 * - Duplicate records are prevented by the unique barber index.
 */
export const createReviewQR = async (req, res) => {
  try {
    const { barberId } = req.params;

    if (!isValidObjectId(barberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid barber ID",
      });
    }

    const barber = await Barber.findById(barberId).select(
      "_id name photo active reviewLinks"
    );

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found",
      });
    }

    // Prevent creating multiple QR records for the same barber.
    const existingQR = await ReviewQR.findOne({
      barber: barber._id,
    });

    if (existingQR) {
      return res.status(409).json({
        success: false,
        message: "Review QR already exists. Use regenerate instead.",
      });
    }

    const publicId = generatePublicId();

    const reviewQR = await ReviewQR.create({
      barber: barber._id,
      publicId,
      active: true,
    });

    return res.status(201).json({
      success: true,
      message: "Review QR created successfully",
      data: {
        qr: {
          id: reviewQR._id,
          barberId: barber._id,
          publicId: reviewQR.publicId,
          publicUrl: getPublicReviewUrl(reviewQR.publicId),
          active: reviewQR.active,
          createdAt: reviewQR.createdAt,
          regeneratedAt: reviewQR.regeneratedAt,
        },
        barber: {
          id: barber._id,
          name: barber.name,
          photo: barber.photo,
          reviewLinks: barber.reviewLinks || {},
        },
      },
    });
  } catch (error) {
    // Handles concurrent requests against the unique barber index.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Review QR already exists for this barber",
      });
    }

    console.error("Create review QR error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create review QR",
    });
  }
};

/**
 * GET /api/admin/barbers/:barberId/review-qr
 *
 * Retrieve QR status and metadata.
 * Returns the permanent publicUrl so the admin can re-open the QR later.
 */
export const getReviewQR = async (req, res) => {
  try {
    const { barberId } = req.params;

    if (!isValidObjectId(barberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid barber ID",
      });
    }

    const barber = await Barber.findById(barberId).select(
      "_id name photo active reviewLinks"
    );

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found",
      });
    }

    const reviewQR = await ReviewQR.findOne({
      barber: barber._id,
    });

    if (!reviewQR) {
      return res.status(404).json({
        success: false,
        message: "Review QR has not been created",
      });
    }

    await ensurePermanentPublicId(reviewQR);

    return res.status(200).json({
      success: true,
      data: {
        qr: {
          id: reviewQR._id,
          barberId: barber._id,
          publicId: reviewQR.publicId,
          publicUrl: getPublicReviewUrl(reviewQR.publicId),
          active: reviewQR.active,
          createdAt: reviewQR.createdAt,
          updatedAt: reviewQR.updatedAt,
          regeneratedAt: reviewQR.regeneratedAt,
        },
        barber: {
          id: barber._id,
          name: barber.name,
          photo: barber.photo,
          active: barber.active,
          reviewLinks: barber.reviewLinks || {},
        },
      },
    });
  } catch (error) {
    console.error("Get review QR error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve review QR",
    });
  }
};

/**
 * POST /api/admin/barbers/:barberId/review-qr/regenerate
 *
 * Kept for backward compatibility with the admin UI.
 * The public ID is permanent, so this endpoint simply returns
 * the existing QR record rather than replacing it.
 */
export const regenerateReviewQR = async (req, res) => {
  try {
    const { barberId } = req.params;

    if (!isValidObjectId(barberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid barber ID",
      });
    }

    const barber = await Barber.findById(barberId).select(
      "_id name photo active reviewLinks"
    );

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found",
      });
    }

    const reviewQR = await ReviewQR.findOne({
      barber: barber._id,
    });

    if (!reviewQR) {
      return res.status(404).json({
        success: false,
        message: "Review QR has not been created. Create it first.",
      });
    }

    await ensurePermanentPublicId(reviewQR);

    return res.status(200).json({
      success: true,
      message: "Permanent review QR retrieved successfully",
      data: {
        qr: {
          id: reviewQR._id,
          barberId: barber._id,
          publicId: reviewQR.publicId,
          publicUrl: getPublicReviewUrl(reviewQR.publicId),
          active: reviewQR.active,
          regeneratedAt: reviewQR.regeneratedAt,
        },
        barber: {
          id: barber._id,
          name: barber.name,
          photo: barber.photo,
          reviewLinks: barber.reviewLinks || {},
        },
      },
    });
  } catch (error) {
    console.error("Regenerate review QR error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve permanent review QR",
    });
  }
};

/**
 * PATCH /api/admin/barbers/:barberId/review-qr/status
 *
 * Activate or deactivate the QR.
 * Never changes publicId.
 *
 * Expected body:
 * { "active": true }
 * or
 * { "active": false }
 */
export const updateReviewQRStatus = async (req, res) => {
  try {
    const { barberId } = req.params;
    const { active } = req.body;

    if (!isValidObjectId(barberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid barber ID",
      });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "active must be a boolean",
      });
    }

    const barber = await Barber.findById(barberId).select("_id");

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found",
      });
    }

    const reviewQR = await ReviewQR.findOneAndUpdate(
      { barber: barber._id },
      { $set: { active } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!reviewQR) {
      return res.status(404).json({
        success: false,
        message: "Review QR has not been created",
      });
    }

    await ensurePermanentPublicId(reviewQR);

    return res.status(200).json({
      success: true,
      message: active
        ? "Review QR activated successfully"
        : "Review QR deactivated successfully",
      data: {
        qr: {
          id: reviewQR._id,
          barberId: reviewQR.barber,
          publicId: reviewQR.publicId,
          publicUrl: getPublicReviewUrl(reviewQR.publicId),
          active: reviewQR.active,
          updatedAt: reviewQR.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Update review QR status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update review QR status",
    });
  }
};

/**
 * GET /api/reviews/qr/:token
 *
 * Public endpoint to resolve a permanent publicId to safe barber
 * information and external review destinations.
 *
 * Also falls back to the legacy tokenHash lookup so QR codes that
 * were printed before the publicId migration continue to resolve
 * during the transition window.
 *
 * Does NOT create a review or authorize review submission.
 */
export const resolveReviewQR = async (req, res) => {
  try {
    const { token: publicId } = req.params;

    // randomBytes(32).toString("hex") produces 64 hex characters.
    if (
      typeof publicId !== "string" ||
      !/^[a-f0-9]{64}$/.test(publicId)
    ) {
      return res.status(404).json({
        success: false,
        message: "Invalid or unavailable review QR",
      });
    }

    const legacyHash = hashLegacyToken(publicId);

    const reviewQR = await ReviewQR.findOne({
      active: true,
      $or: [
        { publicId },
        { tokenHash: legacyHash },
      ],
    }).select("+tokenHash barber active publicId");

    if (!reviewQR) {
      return res.status(404).json({
        success: false,
        message: "Invalid or unavailable review QR",
      });
    }

    const barber = await Barber.findOne({
      _id: reviewQR.barber,
      active: true,
    }).select(
      "_id name photo bio specialties reviewLinks"
    );

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Invalid or unavailable review QR",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        barber: {
          id: barber._id,
          name: barber.name,
          photo: barber.photo,
          bio: barber.bio,
          specialties: barber.specialties,
        },
        reviewLinks: {
          google: barber.reviewLinks?.google || "",
          facebook: barber.reviewLinks?.facebook || "",
          website: barber.reviewLinks?.website || "",
        },
      },
    });
  } catch (error) {
    console.error("Resolve review QR error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resolve review QR",
    });
  }
};

/**
 * GET /api/barber/review-qr
 *
 * Barber self-service handler.
 * Uses the authenticated user's mongoId (set by protect + requireBarber)
 * to find the linked barber profile. Does NOT accept a barber ID from
 * the browser.
 */
export const getMyReviewQR = async (req, res) => {
  try {
    const userId = req.user?.mongoId;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const barber = await Barber.findOne({
      userId,
      active: true,
    }).select("_id name photo reviewLinks");

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber profile not found",
      });
    }

    const reviewQR = await ReviewQR.findOne({
      barber: barber._id,
    });

    if (!reviewQR) {
      return res.status(404).json({
        success: false,
        message: "Review QR has not been created",
      });
    }

    await ensurePermanentPublicId(reviewQR);

    return res.status(200).json({
      success: true,
      data: {
        qr: {
          id: reviewQR._id,
          barberId: barber._id,
          publicId: reviewQR.publicId,
          publicUrl: getPublicReviewUrl(reviewQR.publicId),
          active: reviewQR.active,
          createdAt: reviewQR.createdAt,
        },
        barber: {
          id: barber._id,
          name: barber.name,
          photo: barber.photo,
          reviewLinks: barber.reviewLinks || {},
        },
      },
    });
  } catch (error) {
    console.error("Get my review QR error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your review QR",
    });
  }
};

