import EmailTemplate from "../models/EmailTemplate.js";

const EMAIL_TEMPLATES = [
  {
    type: "booking-confirmation",
    name: "Booking Confirmation",
    description: "Sent when a customer's appointment is confirmed.",
    subject: "Your appointment at {{shopName}} is confirmed",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          Your appointment at {{shopName}} has been confirmed.
        </p>

        <p>
          <strong>Service:</strong> {{serviceName}}<br />
          <strong>Barber:</strong> {{barberName}}<br />
          <strong>Date:</strong> {{appointmentDate}}<br />
          <strong>Time:</strong> {{appointmentTime}}
        </p>

        <p>
          We look forward to seeing you.
        </p>

        <p>
          — {{shopName}}
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "barberName",
      "serviceName",
      "appointmentDate",
      "appointmentTime",
      "shopName",
      "bookingLink",
    ],
  },

  {
    type: "appointment-reminder",
    name: "Appointment Reminder",
    description: "Reminder sent before an upcoming appointment.",
    subject: "Reminder: Your appointment at {{shopName}}",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          Just a reminder that you have an appointment coming up at
          {{shopName}}.
        </p>

        <p>
          <strong>Service:</strong> {{serviceName}}<br />
          <strong>Barber:</strong> {{barberName}}<br />
          <strong>Date:</strong> {{appointmentDate}}<br />
          <strong>Time:</strong> {{appointmentTime}}
        </p>

        <p>
          See you soon.
        </p>

        <p>
          — {{shopName}}
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "barberName",
      "serviceName",
      "appointmentDate",
      "appointmentTime",
      "shopName",
      "bookingLink",
    ],
  },

  {
    type: "thank-you",
    name: "Thank You",
    description: "Sent after a completed appointment.",
    subject: "Thanks for visiting {{shopName}}",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          Thanks for visiting {{shopName}}.
          We hope you enjoyed your experience.
        </p>

        <p>
          We look forward to seeing you again.
        </p>

        <p>
          — {{shopName}}
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "barberName",
      "serviceName",
      "appointmentDate",
      "appointmentTime",
      "shopName",
      "bookingLink",
    ],
  },

  {
    type: "review-request",
    name: "Review Request",
    description: "Sent after an appointment to request customer feedback.",
    subject: "How was your visit to {{shopName}}?",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          We hope you enjoyed your recent visit to {{shopName}}.
        </p>

        <p>
          We'd love to hear about your experience.
        </p>

        <p>
          <a href="{{reviewLink}}">
            Leave a review
          </a>
        </p>

        <p>
          Thank you for choosing {{shopName}}.
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "barberName",
      "serviceName",
      "appointmentDate",
      "appointmentTime",
      "shopName",
      "reviewLink",
    ],
  },

  {
    type: "rebooking-followup",
    name: "Rebooking / Win-Back",
    description: "Sent to customers who have not returned for a configured period.",
    subject: "Ready for your next cut?",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          It's been a little while since your last visit to
          {{shopName}}.
        </p>

        <p>
          Whenever you're ready for your next cut, we'd love to see you again.
        </p>

        <p>
          <a href="{{bookingLink}}">
            Book your next appointment
          </a>
        </p>

        <p>
          — {{shopName}}
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "barberName",
      "shopName",
      "bookingLink",
    ],
  },

  {
    type: "birthday",
    name: "Birthday",
    description: "Birthday message for customers.",
    subject: "Happy Birthday from {{shopName}}",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          Happy Birthday from everyone at {{shopName}}!
        </p>

        <p>
          We hope you have an amazing day.
        </p>

        <p>
          — {{shopName}}
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "shopName",
      "bookingLink",
    ],
  },

  {
    type: "holiday",
    name: "Holiday",
    description: "Holiday announcement or seasonal message.",
    subject: "A message from {{shopName}}",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          We wanted to wish you a great holiday season from everyone at
          {{shopName}}.
        </p>

        <p>
          We look forward to seeing you again.
        </p>

        <p>
          — {{shopName}}
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "shopName",
      "bookingLink",
    ],
  },

  {
    type: "promotion",
    name: "Promotion",
    description: "Marketing email for promotions and special offers.",
    subject: "Something special from {{shopName}}",
    body: `
      <div>
        <p>Hi {{customerName}},</p>

        <p>
          We have something special for you at {{shopName}}.
        </p>

        <p>
          {{promotionMessage}}
        </p>

        <p>
          <a href="{{bookingLink}}">
            Book your appointment
          </a>
        </p>

        <p>
          — {{shopName}}
        </p>

        <p>
          <small>
            You are receiving this email because you opted in to
            marketing communications.
          </small>
        </p>
      </div>
    `,
    enabled: true,
    variables: [
      "customerName",
      "shopName",
      "promotionMessage",
      "bookingLink",
      "unsubscribeLink",
    ],
  },
];

export const seedEmailTemplates = async () => {
  for (const template of EMAIL_TEMPLATES) {
    await EmailTemplate.updateOne(
      { type: template.type },
      {
        $setOnInsert: template,
      },
      {
        upsert: true,
      }
    );
  }

  console.log("Email templates initialized.");
};

export default EMAIL_TEMPLATES;