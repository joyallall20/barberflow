// middleware/error.js
import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    const first = err.issues[0];
    message = first ? `${first.path.join(".") || "body"}: ${first.message}` : "Validation failed";
    errors = err.flatten();
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate key conflict";
    errors = err.keyValue;
  } else {
    // eslint-disable-next-line no-console
    console.error("[Unhandled Error]", err);
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;

  res.status(statusCode).json(body);
};