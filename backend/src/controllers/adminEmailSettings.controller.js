import { DateTime } from "luxon";
import EmailSettings from "../models/EmailSettings.js";

const ALLOWED_SETTINGS = {
  beforeAppointment: {
    bookingConfirmation: {
      enabled: "boolean",
      delayMinutes: "integer",
    },
    appointmentReminder: {
      enabled: "boolean",
      minutesBefore: "integer",
    },
  },

  afterAppointment: {
    thankYou: {
      enabled: "boolean",
      delayMinutes: "integer",
    },
    reviewRequest: {
      enabled: "boolean",
      delayMinutes: "integer",
    },
  },

  followupWinback: {
    enabled: "boolean",
    delayDays: "integer",
  },

  specialOccasions: {
    birthday: {
      enabled: "boolean",
      daysBefore: "integer",
    },
    holiday: {
      enabled: "boolean",
    },
  },

  promotions: {
    enabled: "boolean",
  },
};

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const validateAndApply = (target, payload, allowed, path = "") => {
  if (!isPlainObject(payload)) {
    throw new Error(`${path || "Settings"} must be an object`);
  }

  for (const [key, value] of Object.entries(payload)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const expected = allowed[key];

    if (expected === undefined) {
      throw new Error(`Unsupported setting: ${fieldPath}`);
    }

    if (isPlainObject(expected)) {
      validateAndApply(target[key], value, expected, fieldPath);
      continue;
    }

    if (expected === "boolean" && typeof value !== "boolean") {
      throw new Error(`${fieldPath} must be a boolean`);
    }

    if (
      expected === "integer" &&
      (!Number.isSafeInteger(value) || value < 0)
    ) {
      throw new Error(
        `${fieldPath} must be a non-negative integer`
      );
    }

    target[key] = value;
  }
};

// GET /api/admin/email-settings
export const getEmailSettings = async (req, res) => {
  try {
    const settings = await EmailSettings.getOrCreate();

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get email settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch email settings",
    });
  }
};

// PATCH /api/admin/email-settings
export const updateEmailSettings = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Request body must be an object",
      });
    }

    const settings = await EmailSettings.getOrCreate();

    // Update global automation switch.
    if (req.body.automationEnabled !== undefined) {
      if (typeof req.body.automationEnabled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "automationEnabled must be a boolean",
        });
      }

      settings.automationEnabled = req.body.automationEnabled;
    }

    // Validate IANA timezone.
    if (req.body.timezone !== undefined) {
      const timezone = req.body.timezone;

      if (
        typeof timezone !== "string" ||
        !DateTime.now().setZone(timezone).isValid
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid timezone",
        });
      }

      settings.timezone = timezone;
    }

    // Reject unknown top-level fields.
    const allowedTopLevel = [
      "automationEnabled",
      "timezone",
      ...Object.keys(ALLOWED_SETTINGS),
    ];

    for (const key of Object.keys(req.body)) {
      if (!allowedTopLevel.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported setting: ${key}`,
        });
      }
    }

    // Validate and apply nested settings.
    for (const [section, allowed] of Object.entries(
      ALLOWED_SETTINGS
    )) {
      if (req.body[section] === undefined) continue;

      validateAndApply(
        settings[section],
        req.body[section],
        allowed,
        section
      );
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Email settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Update email settings error:", error);

    if (
      error.name === "ValidationError" ||
      error.message?.includes("Unsupported setting") ||
      error.message?.includes("must be")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update email settings",
    });
  }
};