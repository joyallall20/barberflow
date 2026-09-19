import mongoose from "mongoose";

const recurringBlockedTimeSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["all_barbers", "barber"],
      required: true,
      default: "all_barbers",
      index: true
    },

    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      default: null,
      index: true
    },

    daysOfWeek: {
      type: [Number],
      required: true,
      validate: {
        validator: function (days) {
          return (
            Array.isArray(days) &&
            days.length > 0 &&
            days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
          );
        },
        message: "daysOfWeek must contain integers from 0 to 6"
      }
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },

    startDate: {
      type: Date,
      default: null
    },

    endDate: {
      type: Date,
      default: null
    },

    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

recurringBlockedTimeSchema.pre("validate", function () {
  // Normalize daysOfWeek to unique sorted values
  if (Array.isArray(this.daysOfWeek)) {
    this.daysOfWeek = [...new Set(this.daysOfWeek)].sort((a, b) => a - b);
  }

  // Scope validation
  if (this.scope === "all_barbers" && this.barber != null) {
    this.invalidate("barber", "barber must be null when scope is all_barbers");
  }

  if (this.scope === "barber" && !this.barber) {
    this.invalidate("barber", "barber is required when scope is barber");
  }

  // Time validation
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  if (
    this.startTime &&
    this.endTime &&
    toMinutes(this.startTime) >= toMinutes(this.endTime)
  ) {
    this.invalidate("endTime", "End time must be later than start time");
  }

  // Date range validation
  if (this.startDate && this.endDate) {
    if (this.endDate < this.startDate) {
      this.invalidate("endDate", "endDate must not be before startDate");
    }
  }
});

// Indexes for efficient querying of active blocks
recurringBlockedTimeSchema.index({
  active: 1,
  scope: 1,
  barber: 1,
  daysOfWeek: 1
});

const RecurringBlockedTime = mongoose.model(
  "RecurringBlockedTime",
  recurringBlockedTimeSchema
);

export default RecurringBlockedTime;
