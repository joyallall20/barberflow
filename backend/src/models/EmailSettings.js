import mongoose from "mongoose";

const emailSettingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, immutable: true, select: false },
    automationEnabled: { type: Boolean, default: true },
    timezone: { type: String, default: "Asia/Kolkata", trim: true },
    beforeAppointment: {
      bookingConfirmation: { enabled: { type: Boolean, default: true }, delayMinutes: { type: Number, default: 0, min: 0 } },
      appointmentReminder: { enabled: { type: Boolean, default: true }, minutesBefore: { type: Number, default: 1440, min: 0 } },
    },
    afterAppointment: {
      thankYou: { enabled: { type: Boolean, default: true }, delayMinutes: { type: Number, default: 60, min: 0 } },
      reviewRequest: { enabled: { type: Boolean, default: true }, delayMinutes: { type: Number, default: 1440, min: 0 } },
    },
    followupWinback: { enabled: { type: Boolean, default: false }, delayDays: { type: Number, default: 30, min: 0 } },
    specialOccasions: {
      birthday: { enabled: { type: Boolean, default: false }, daysBefore: { type: Number, default: 0, min: 0 } },
      holiday: { enabled: { type: Boolean, default: false } },
    },
    promotions: { enabled: { type: Boolean, default: false } },
  },
  { timestamps: true, strict: true }
);

emailSettingsSchema.statics.getOrCreate = function getOrCreate() {
  return this.findOneAndUpdate(
    { singletonKey: "global" },
    { $setOnInsert: { singletonKey: "global" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
};

const EmailSettings = mongoose.models.EmailSettings || mongoose.model("EmailSettings", emailSettingsSchema);

export default EmailSettings;
