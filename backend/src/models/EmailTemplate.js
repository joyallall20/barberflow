import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    // ============================================================
    // TEMPLATE IDENTIFICATION
    // ============================================================

    type: {
      type: String,
      enum: [
        "booking-confirmation",
        "appointment-reminder",
        "thank-you",
        "review-request",
        "rebooking-followup",
        "birthday",
        "holiday",
        "promotion",
      ],
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // EMAIL CONTENT
    // ============================================================

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // HTML email body
    body: {
      type: String,
      required: true,
    },

    // ============================================================
    // TEMPLATE STATUS
    // ============================================================

    enabled: {
      type: Boolean,
      default: true,
    },

    // ============================================================
    // AVAILABLE VARIABLES
    // ============================================================

    variables: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

const EmailTemplate =
  mongoose.models.EmailTemplate ||
  mongoose.model("EmailTemplate", emailTemplateSchema);

export default EmailTemplate;