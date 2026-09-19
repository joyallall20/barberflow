// src/models/User.js

import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Role is controlled by backend admin logic only.
    // It is immutable after creation via Mongoose save() to stop client‑side role spoofing.
    role: {
      type: String,
      enum: ["customer", "admin", "owner", "barber"],
      default: "customer",
      immutable: true,
    },

    // Optional reference to a Barber profile.
    // Sparse + Unique => 1-to-1 relationship enforced at DB index level.
    barberId: {
      type: Schema.Types.ObjectId,
      ref: "Barber",
      unique: true,
      sparse: true,
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

const User = mongoose.model("User", userSchema);

export default User;