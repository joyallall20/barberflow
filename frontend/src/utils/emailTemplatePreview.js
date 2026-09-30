// ============================================================
// EMAIL TEMPLATE PREVIEW UTILITIES
// ============================================================

export const EMAIL_TEMPLATE_SAMPLE_VALUES = {
  customerName: "Alex Morgan",
  barberName: "James",
  serviceName: "Classic Haircut",
  appointmentDate: "October 5, 2026",
  appointmentTime: "3:00 PM",
  shopName: "THE FOUNDRY",
  reviewLink: "https://example.com/review",
  bookingLink: "https://example.com/book",
  promotionMessage:
    "Enjoy 20% off your next appointment this week.",
  unsubscribeLink: "https://example.com/unsubscribe",
};

// ============================================================
// HTML ESCAPING
// ============================================================

export const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ============================================================
// VARIABLE SUBSTITUTION
// ============================================================

export const replaceTemplateVariables = (
  content,
  values = EMAIL_TEMPLATE_SAMPLE_VALUES
) => {
  if (!content) {
    return "";
  }

  return content.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (match, variable) => {
      if (!(variable in values)) {
        return `<span style="color:#b45309;font-weight:600;">${escapeHtml(
          match
        )}</span>`;
      }

      return escapeHtml(values[variable]);
    }
  );
};

// ============================================================
// SUBJECT PREVIEW
// ============================================================

export const replaceSubjectVariables = (
  subject,
  values = EMAIL_TEMPLATE_SAMPLE_VALUES
) => {
  if (!subject) {
    return "";
  }

  return subject.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (match, variable) => {
      if (!(variable in values)) {
        return match;
      }

      return values[variable];
    }
  );
};

// ============================================================
// TEMPLATE GROUPS
// ============================================================

export const EMAIL_TEMPLATE_GROUPS = [
  {
    label: "Before Appointment",
    types: [
      "booking-confirmation",
      "appointment-reminder",
    ],
  },
  {
    label: "After Appointment",
    types: [
      "thank-you",
      "review-request",
    ],
  },
  {
    label: "Retention",
    types: [
      "rebooking-followup",
    ],
  },
  {
    label: "Special Occasions",
    types: [
      "birthday",
      "holiday",
    ],
  },
  {
    label: "Marketing",
    types: [
      "promotion",
    ],
  },
];

export const EMAIL_TEMPLATE_LABELS = {
  "booking-confirmation": "Booking Confirmation",
  "appointment-reminder": "Appointment Reminder",
  "thank-you": "Thank You",
  "review-request": "Review Request",
  "rebooking-followup": "Rebooking / Win-Back",
  birthday: "Birthday",
  holiday: "Holiday",
  promotion: "Promotion",
};