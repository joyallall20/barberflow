import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
  type: String,
  default: ""
      },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    preferredBarber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      default: null,
    },

    preferredService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;