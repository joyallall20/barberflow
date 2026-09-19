// models/BookingLock.js

import mongoose from "mongoose";

const bookingLockSchema = new mongoose.Schema(
  {
    /*
     * The _id is intentionally a STRING.
     *
     * Format:
     * <barberId>_<YYYY-MM-DD>
     *
     * Example:
     * 6aae33099a65bf661690f3f_2026-09-21
     *
     * This gives us one lock document per barber per day.
     */
    _id: {
      type: String,
      required: true,
    },

    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const BookingLock = mongoose.model(
  "BookingLock",
  bookingLockSchema
);

export default BookingLock;