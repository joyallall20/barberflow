import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["paypal"],
      default: "paypal",
      required: true,
    },

    providerOrderId: {
      type: String,
      index: true,
    },

    providerCaptureId: {
      type: String,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },

    type: {
      type: String,
      enum: ["deposit", "full_payment"],
      default: "deposit",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "completed",
        "partially_refunded",
        "refunded",
        "failed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    failureReason: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Payment", paymentSchema);