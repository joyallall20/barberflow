
// models/BlockedTime.js

import mongoose from "mongoose";

const blockedTimeSchema = new mongoose.Schema(
  {
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

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Prevent invalid time ranges.
 */
blockedTimeSchema.pre("validate", function () {
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  if (
    this.startTime &&
    this.endTime &&
    toMinutes(this.startTime) >= toMinutes(this.endTime)
  ) {
    this.invalidate(
      "endTime",
      "End time must be later than start time"
    );
  }
});

/**
 * Efficient lookup for a barber's blocked periods.
 */
blockedTimeSchema.index({
  barber: 1,
  date: 1,
  active: 1,
});

const BlockedTime = mongoose.model(
  "BlockedTime",
  blockedTimeSchema
);

export default BlockedTime;
