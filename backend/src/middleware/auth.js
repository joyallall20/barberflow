// src/middleware/auth.js

import { firebaseAuth } from "../config/firebase.js";
import User from "../models/User.js";

/**
 * Authentication middleware.
 *
 * - Verifies Firebase ID token (including revocation checks).
 * - Normalises email (trim + lowercase).
 * - Enforces email verification for password authentication.
 * - Looks up corresponding active MongoDB user.
 * - Provides minimal req.user object for downstream middleware & controllers.
 * - Allows first-login sync (needsSync: true) when no DB user exists yet.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
      });
    }

    // 1. Verify token and check revocation status
    const decodedToken = await firebaseAuth.verifyIdToken(token, true);

    // 2. Normalise email
    const normalizedEmail = decodedToken.email
      ? decodedToken.email.trim().toLowerCase()
      : null;

    // 3. Provider-aware email verification check
    // Password sign-in requires email_verified === true.
    // Google & social OAuth providers are verified by Firebase guarantees.
    const signInProvider = decodedToken.firebase?.sign_in_provider;
    if (signInProvider === "password" && !decodedToken.email_verified) {
      return res.status(403).json({
        success: false,
        message: "Email address not verified. Please verify your email before logging in.",
      });
    }

    // 4. Look up MongoDB User by firebaseUid
    const dbUser = await User.findOne({
      firebaseUid: decodedToken.uid,
      active: true,
    }).select("_id name email role active barberId");

    // -----------------------------------------------------------------
    // First-login tolerance:
    //   - Verified Firebase identity with no DB user yet is allowed
    //     through so it can hit POST /api/me/sync and create its record.
    //   - Temporary user object has `needsSync: true` and role: null.
    // -----------------------------------------------------------------
    if (!dbUser) {
      req.user = {
        uid: decodedToken.uid,
        provider: signInProvider || null,
        email: normalizedEmail,
        name: decodedToken.name || null,
        role: null,
        mongoId: null,
        barberId: null,
        active: null,
        needsSync: true,
      };
      return next();
    }

    // Valid, active DB user attached
    req.user = {
      uid: decodedToken.uid,
      provider: signInProvider || null,
      email: dbUser.email, // Normalized in DB
      name: dbUser.name,
      role: dbUser.role,
      mongoId: dbUser._id,
      barberId: dbUser.barberId || null,
      active: dbUser.active,
      needsSync: false,
    };

    return next();
  } catch (error) {
    const isRevoked = error.code === "auth/id-token-revoked";

    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: isRevoked
        ? "Authentication token has been revoked. Please log in again."
        : "Invalid or expired authentication token",
    });
  }
};

export default protect;