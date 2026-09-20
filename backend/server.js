// ALWAYS put import "dotenv/config" at line 1 in ES Modules
import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";

import apiRouter from "./src/routes/index.js";
import { notFoundHandler, errorHandler } from "./src/middleware/error.js";
import { apiLimiter } from "./src/middleware/rateLimiter.js";
import { handlePaypalWebhook } from "./src/controllers/webhook.controller.js";

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// Production Security & Proxy Settings
// --------------------------------------------------
// Set trust proxy when behind reverse proxies / Cloudflare
if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) in dev
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --------------------------------------------------
// PayPal Webhook (MUST be before express.json())
// --------------------------------------------------
// PayPal webhooks require the *raw* request body to verify
// the transmission signature. `express.raw` captures the body
// as a Buffer without parsing it — that buffer is then used
// against the PayPal-Verification header set.
app.post(
  "/api/webhooks/paypal",
  express.raw({ type: "application/json", limit: "1mb" }),
  handlePaypalWebhook
);

// --------------------------------------------------
// Body Parsing (after webhook routes)
// --------------------------------------------------
// Body parsing limits (prevent payload memory exhaustion attacks)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// General Rate Limiting for API routes
// (note: webhooks bypass this since they're registered earlier)
app.use("/api", apiLimiter);

// --------------------------------------------------
// Routes
// --------------------------------------------------
app.use("/api", apiRouter);

// --------------------------------------------------
// Error Handling
// --------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// --------------------------------------------------
// Server Startup & Graceful Shutdown
// --------------------------------------------------
let server;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    server = app.listen(PORT, () => {
      console.log(`The Foundry API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

connectDB();