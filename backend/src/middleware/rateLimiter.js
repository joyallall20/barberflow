// src/middleware/rateLimiter.js
import { rateLimit } from "express-rate-limit";

const makeLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

// Auth / Sync endpoint rate limiter (protects login & sync brute force)
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: "Too many authentication attempts from this IP. Please try again later.",
});

// Public read endpoints rate limiter
export const publicLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: "Too many requests to public endpoints. Please slow down.",
});

// Appointment creation rate limiter (protects against booking spam)
export const appointmentLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many booking requests from this IP. Please try again later.",
});

// Admin endpoints rate limiter
export const adminLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many admin requests. Please slow down.",
});

// Image upload endpoint rate limiter
export const uploadLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many image upload attempts. Please try again later.",
});

// General fallback API limiter
export const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests to the API. Please try again later.",
});
