import { EMAIL_TEMPLATE_GROUPS } from "./emailTemplatePreview.js";

// Map each automation setting to its email template type.
// Adjust the values if your backend uses different slugs.
export const SETTING_TO_TEMPLATE = {
  bookingConfirmation: "bookingConfirmation",
  appointmentReminder: "appointmentReminder",
  thankYou: "thankYou",
  reviewRequest: "reviewRequest",
  winback: "winback",
  birthday: "birthday",
  holiday: "holiday",
  promotion: "promotion",
};

export const templatePath = (type) =>
  type
    ? `/admin/email-templates?type=${encodeURIComponent(type)}`
    : "/admin/email-templates";

export const isValidTemplateType = (type) =>
  EMAIL_TEMPLATE_GROUPS.some((group) => group.types.includes(type));