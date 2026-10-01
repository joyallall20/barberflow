import { Worker } from "bullmq";

import redisConnection from "../config/redis.js";
import { sendEmail } from "../services/email.service.js";
import Appointment from "../models/Appointment.js";

const FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.CLIENT_URL;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatAppointmentTime = (appointment) => {
  if (!appointment?.startTime) return "";

  return appointment.startTime;
};

/* ------------------------------------------------------------------ */
/* Email Layout                                                       */
/* ------------------------------------------------------------------ */

const emailLayout = ({
  title,
  customerName,
  content,
  buttonText,
  buttonUrl,
}) => {
  const safeCustomerName = escapeHtml(customerName || "there");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background: #f5f1e8;
        font-family: Arial, Helvetica, sans-serif;
        color: #171717;
      ">

        <div style="
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        ">

          <div style="
            background: #111111;
            color: #f5f1e8;
            padding: 28px;
            text-align: center;
          ">
            <h1 style="
              margin: 0;
              font-size: 28px;
              letter-spacing: 3px;
            ">
              THE FOUNDRY
            </h1>
          </div>

          <div style="
            background: #ffffff;
            padding: 35px 30px;
          ">

            <h2 style="
              margin-top: 0;
              font-size: 24px;
            ">
              ${escapeHtml(title)}
            </h2>

            <p>
              Hi ${safeCustomerName},
            </p>

            ${content}

            ${
              buttonText && buttonUrl
                ? `
                  <div style="
                    margin: 30px 0;
                    text-align: center;
                  ">
                    <a
                      href="${escapeHtml(buttonUrl)}"
                      style="
                        display: inline-block;
                        padding: 14px 24px;
                        background: #b45309;
                        color: #ffffff;
                        text-decoration: none;
                        font-weight: bold;
                      "
                    >
                      ${escapeHtml(buttonText)}
                    </a>
                  </div>
                `
                : ""
            }

            <p style="
              margin-top: 35px;
              color: #666666;
              font-size: 14px;
            ">
              THE FOUNDRY
            </p>

          </div>
        </div>

      </body>
    </html>
  `;
};

/* ------------------------------------------------------------------ */
/* Appointment Data                                                   */
/* ------------------------------------------------------------------ */

const loadAppointment = async (appointmentId) => {
  return Appointment.findById(appointmentId)
    .populate("customer", "name email")
    .populate("barber", "name")
    .populate("service", "name");
};

/* ------------------------------------------------------------------ */
/* Worker                                                            */
/* ------------------------------------------------------------------ */

const worker = new Worker(
  "foundry-email",
  async (job) => {
    const {
      type,
      appointmentId,
    } = job.data;

    if (!appointmentId) {
      throw new Error(
        "Email job is missing appointmentId"
      );
    }

    const appointment =
      await loadAppointment(appointmentId);

    if (!appointment) {
      console.log(
        `Appointment ${appointmentId} no longer exists. Skipping email.`
      );

      return {
        skipped: true,
        reason: "appointment_not_found",
      };
    }

    /* -------------------------------------------------------------- */
    /* Global cancellation check                                      */
    /* -------------------------------------------------------------- */

    if (
      appointment.status === "cancelled" ||
      appointment.status === "no_show"
    ) {
      return {
        skipped: true,
        reason: `appointment_${appointment.status}`,
      };
    }

    const customer = appointment.customer;

    if (!customer?.email) {
      return {
        skipped: true,
        reason: "customer_email_missing",
      };
    }

    const customerName =
      customer.name || "there";

    const barberName =
      appointment.barber?.name || "your barber";

    const serviceName =
      appointment.service?.name || "your appointment";

    const appointmentDate =
      formatDate(appointment.date);

    const appointmentTime =
      formatAppointmentTime(appointment);

    const appointmentDetails = `
      <p>
        <strong>Service:</strong>
        ${escapeHtml(serviceName)}
      </p>

      <p>
        <strong>Barber:</strong>
        ${escapeHtml(barberName)}
      </p>

      <p>
        <strong>Date:</strong>
        ${escapeHtml(appointmentDate)}
      </p>

      <p>
        <strong>Time:</strong>
        ${escapeHtml(appointmentTime)}
      </p>
    `;

    /* -------------------------------------------------------------- */
    /* Booking confirmation                                           */
    /* -------------------------------------------------------------- */

    if (type === "booking-confirmation") {
      if (appointment.status !== "confirmed") {
        return {
          skipped: true,
          reason: "appointment_not_confirmed",
        };
      }

      const html = emailLayout({
        title: "Your appointment is confirmed",
        customerName,
        content: `
          <p>
            Your appointment at THE FOUNDRY has been confirmed.
          </p>

          ${appointmentDetails}

          <p>
            We look forward to seeing you.
          </p>
        `,
      });

      const result = await sendEmail({
        to: customer.email,
        subject: "Your THE FOUNDRY appointment is confirmed",
        htmlContent: html,
      });

      return {
        sent: true,
        type,
        messageId: result.messageId,
      };
    }

    /* -------------------------------------------------------------- */
    /* Appointment reminder                                           */
    /* -------------------------------------------------------------- */

    if (type === "appointment-reminder") {
      if (appointment.status !== "confirmed") {
        return {
          skipped: true,
          reason: "appointment_not_confirmed",
        };
      }

      if (appointment.reminderSent) {
        return {
          skipped: true,
          reason: "reminder_already_sent",
        };
      }

      const html = emailLayout({
        title: "Your appointment is coming up",
        customerName,
        content: `
          <p>
            Just a reminder that your appointment at
            THE FOUNDRY is coming up.
          </p>

          ${appointmentDetails}

          <p>
            We'll see you soon.
          </p>
        `,
      });

      const result = await sendEmail({
        to: customer.email,
        subject: "Reminder: Your THE FOUNDRY appointment",
        htmlContent: html,
      });

      appointment.reminderSent = true;
      await appointment.save();

      return {
        sent: true,
        type,
        messageId: result.messageId,
      };
    }

    /* -------------------------------------------------------------- */
    /* Thank-you email                                                 */
    /* -------------------------------------------------------------- */

    if (type === "thank-you") {
      if (appointment.status !== "completed") {
        return {
          skipped: true,
          reason: "appointment_not_completed",
        };
      }

      const html = emailLayout({
        title: "Thanks for visiting THE FOUNDRY",
        customerName,
        content: `
          <p>
            Thanks for choosing THE FOUNDRY.
          </p>

          <p>
            We hope you enjoyed your ${escapeHtml(
              serviceName
            )} with ${escapeHtml(barberName)}.
          </p>

          <p>
            We appreciate your business and look forward
            to seeing you again.
          </p>
        `,
      });

      const result = await sendEmail({
        to: customer.email,
        subject: "Thanks for visiting THE FOUNDRY",
        htmlContent: html,
      });

      return {
        sent: true,
        type,
        messageId: result.messageId,
      };
    }

    /* -------------------------------------------------------------- */
    /* Review request                                                  */
    /* -------------------------------------------------------------- */

    if (type === "review-request") {
      if (appointment.status !== "completed") {
        return {
          skipped: true,
          reason: "appointment_not_completed",
        };
      }

      if (appointment.reviewRequestSent) {
        return {
          skipped: true,
          reason: "review_request_already_sent",
        };
      }

      const reviewUrl = FRONTEND_URL
        ? `${FRONTEND_URL}/review`
        : null;

      const html = emailLayout({
        title: "How was your experience?",
        customerName,
        content: `
          <p>
            Thanks again for visiting THE FOUNDRY.
          </p>

          <p>
            We'd love to hear how your experience was.
            Your feedback helps us continue improving.
          </p>
        `,
        buttonText: reviewUrl
          ? "Leave a Review"
          : null,
        buttonUrl: reviewUrl,
      });

      const result = await sendEmail({
        to: customer.email,
        subject: "How was your THE FOUNDRY experience?",
        htmlContent: html,
      });

      appointment.reviewRequestSent = true;
      await appointment.save();

      return {
        sent: true,
        type,
        messageId: result.messageId,
      };
    }

    /* -------------------------------------------------------------- */
    /* Rebooking / win-back                                           */
    /* -------------------------------------------------------------- */

    if (type === "rebooking-followup") {
      if (appointment.status !== "completed") {
        return {
          skipped: true,
          reason: "appointment_not_completed",
        };
      }

      if (appointment.rebookingReminderSent) {
        return {
          skipped: true,
          reason: "rebooking_reminder_already_sent",
        };
      }

      /*
       * Marketing emails should only be sent when explicit
       * marketing consent exists.
       *
       * This will be enabled once the Customer model contains
       * the appropriate consent field.
       */
      if (customer.emailMarketingConsent !== true) {
        return {
          skipped: true,
          reason: "marketing_consent_missing",
        };
      }

      const bookingUrl = FRONTEND_URL
        ? `${FRONTEND_URL}/book`
        : null;

      const html = emailLayout({
        title: "Ready for your next visit?",
        customerName,
        content: `
          <p>
            It's been a while since your last visit to
            THE FOUNDRY.
          </p>

          <p>
            If you're ready for your next cut, we'd be
            happy to see you again.
          </p>
        `,
        buttonText: bookingUrl
          ? "Book Your Next Visit"
          : null,
        buttonUrl: bookingUrl,
      });

      const result = await sendEmail({
        to: customer.email,
        subject: "Ready for your next visit?",
        htmlContent: html,
      });

      appointment.rebookingReminderSent = true;
      await appointment.save();

      return {
        sent: true,
        type,
        messageId: result.messageId,
      };
    }

    throw new Error(
      `Unsupported email job type: ${type}`
    );
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

/* ------------------------------------------------------------------ */
/* Worker Events                                                      */
/* ------------------------------------------------------------------ */

worker.on("completed", (job) => {
  console.log(
    `Email job completed: ${job.id} (${job.name})`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `Email job failed: ${job?.id || "unknown"}:`,
    error
  );
});

worker.on("error", (error) => {
  console.error("Email worker error:", error);
});

export default worker;
