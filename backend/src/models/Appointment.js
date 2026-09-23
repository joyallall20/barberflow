import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      required: true,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["online", "pay_at_shop"],
      required: true,
      default: "pay_at_shop",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "deposit_paid", "paid", "refunded"],
      default: "unpaid",
      index: true,
    },

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "confirmed",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    reminderSent: {
      type: Boolean,
      default: false,
    },

    reviewRequestSent: {
      type: Boolean,
      default: false,
    },

    rebookingReminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Used heavily by the availability engine.
 */
appointmentSchema.index({
  barber: 1,
  date: 1,
  status: 1,
  startTime: 1,
  endTime: 1,
});

appointmentSchema.index({
  barber: 1,
  date: 1,
  status: 1,
});

appointmentSchema.index({
  customer: 1,
  date: -1,
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;