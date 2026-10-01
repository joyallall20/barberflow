
import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";

import apiRouter from "./src/routes/index.js";
import {
  notFoundHandler,
  errorHandler,
} from "./src/middleware/error.js";
import { apiLimiter } from "./src/middleware/rateLimiter.js";
import { handlePaypalWebhook } from "./src/controllers/webhook.controller.js";
import { seedEmailTemplates } from "./src/seed/emailTemplates.seed.js";

// --------------------------------------------------
// Background Workers / Scheduled Jobs
// --------------------------------------------------

// Start BullMQ email worker
import "./src/workers/email.worker.js";

// Start keep-alive cron job
import "./src/jobs/keepAlive.job.js";

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// PayPal Config Log
// --------------------------------------------------

const paypalBaseUrl =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

console.log("PayPal config:", {
  env: process.env.PAYPAL_ENV,
  baseUrl: paypalBaseUrl,
  clientIdLoaded: Boolean(process.env.PAYPAL_CLIENT_ID),
  clientSecretLoaded: Boolean(process.env.PAYPAL_CLIENT_SECRET),
  clientIdLength: process.env.PAYPAL_CLIENT_ID?.length,
  clientSecretLength: process.env.PAYPAL_CLIENT_SECRET?.length,
});

// --------------------------------------------------
// Production Security & Proxy Settings
// --------------------------------------------------

if (
  process.env.TRUST_PROXY === "true" ||
  process.env.NODE_ENV === "production"
) {
  app.set("trust proxy", 1);
}

// --------------------------------------------------
// Security Headers
// --------------------------------------------------

app.use(helmet());

// --------------------------------------------------
// CORS
// --------------------------------------------------

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (Postman, server-to-server requests, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS policy violation: Origin not allowed")
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --------------------------------------------------
// PayPal Webhook
//
// IMPORTANT:
// Register before express.json() because PayPal
// verification requires the original raw request body.
// --------------------------------------------------

app.post(
  "/api/webhooks/paypal",
  express.raw({
    type: "application/json",
    limit: "1mb",
  }),
  handlePaypalWebhook
);

// --------------------------------------------------
// Body Parsing
// --------------------------------------------------

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb",
  })
);

// --------------------------------------------------
// API Rate Limiting
// --------------------------------------------------

app.use("/api", apiLimiter);

// --------------------------------------------------
// API Routes
//
// All application routes are registered in:
// ./src/routes/index.js
// --------------------------------------------------

app.use("/api", apiRouter);

// --------------------------------------------------
// Health Check
//
// Used by monitoring services and keep-alive checks.
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "The Foundry API",
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use(notFoundHandler);

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use(errorHandler);

// --------------------------------------------------
// Server Startup
// --------------------------------------------------

let server;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined in environment variables"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    // Seed default email templates
    await seedEmailTemplates();

    server = app.listen(PORT, () => {
      console.log(`The Foundry API running on port ${PORT}`);
      console.log(`Health check: /api/health`);
    });
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
};

// --------------------------------------------------
// Graceful Shutdown
// --------------------------------------------------

const shutdown = async (signal) => {
  console.log(
    `Received ${signal}. Shutting down gracefully...`
  );

  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");

      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
      } catch (error) {
        console.error(
          "Error closing MongoDB connection:",
          error.message
        );
      }

      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// --------------------------------------------------
// Process Error Handling
// --------------------------------------------------

process.on("unhandledRejection", (reason) => {
  console.error(
    "Unhandled Promise Rejection:",
    reason
  );
});

process.on("uncaughtException", (error) => {
  console.error(
    "Uncaught Exception:",
    error
  );

  process.exit(1);
});

// --------------------------------------------------
// Start Application
// --------------------------------------------------

connectDB();
