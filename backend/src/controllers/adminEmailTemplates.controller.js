import EmailTemplate from "../models/EmailTemplate.js";

const TEMPLATE_TYPES = [
  "booking-confirmation",
  "appointment-reminder",
  "thank-you",
  "review-request",
  "rebooking-followup",
  "birthday",
  "holiday",
  "promotion",
];

// ============================================================
// GET ALL EMAIL TEMPLATES
// ============================================================

export const getEmailTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find({})
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Get email templates error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch email templates.",
    });
  }
};

// ============================================================
// GET SINGLE EMAIL TEMPLATE
// ============================================================

export const getEmailTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    if (!TEMPLATE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email template type.",
      });
    }

    const template = await EmailTemplate.findOne({ type }).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    return res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Get email template error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch email template.",
    });
  }
};

// ============================================================
// UPDATE EMAIL TEMPLATE
// ============================================================

export const updateEmailTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    if (!TEMPLATE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email template type.",
      });
    }

    const {
      name,
      description,
      subject,
      body,
      enabled,
    } = req.body;

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (
      subject !== undefined &&
      (typeof subject !== "string" || !subject.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Email subject cannot be empty.",
      });
    }

    if (
      body !== undefined &&
      (typeof body !== "string" || !body.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Email body cannot be empty.",
      });
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Template name cannot be empty.",
      });
    }

    if (
      enabled !== undefined &&
      typeof enabled !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Enabled must be a boolean.",
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be a string.",
      });
    }

    // ----------------------------------------------------------
    // Only allow supported fields to be updated.
    // ----------------------------------------------------------

    const updates = {};

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description.trim();
    }

    if (subject !== undefined) {
      updates.subject = subject.trim();
    }

    if (body !== undefined) {
      updates.body = body;
    }

    if (enabled !== undefined) {
      updates.enabled = enabled;
    }

    // ----------------------------------------------------------
    // Find and update
    // ----------------------------------------------------------

    const template = await EmailTemplate.findOneAndUpdate(
      { type },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email template updated successfully.",
      template,
    });
  } catch (error) {
    console.error("Update email template error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update email template.",
    });
  }
};

export { TEMPLATE_TYPES };