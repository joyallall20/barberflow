import { DateTime } from "luxon";

import EmailSettings from "../models/EmailSettings.js";
import Appointment from "../models/Appointment.js";

import {
  enqueueEmail,
  cancelEmailJob,
} from "../queues/email.queue.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const getJobId = (type, appointmentId) =>
  `appointment-${type}-${appointmentId}`;

const getAppointmentStart = (appointment, timezone) => {
  if (!appointment?.date || !appointment?.startTime) {
    throw new Error(
      "Appointment date and startTime are required for email scheduling"
    );
  }

  const date =
    appointment.date instanceof Date
      ? DateTime.fromJSDate(appointment.date, { zone: timezone })
      : DateTime.fromISO(String(appointment.date), {
          zone: timezone,
        });

  if (!date.isValid) {
    throw new Error("Invalid appointment date");
  }

  const [hours, minutes] = String(appointment.startTime)
    .split(":")
    .map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("Invalid appointment startTime");
  }

  return date.set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });
};

const calculateDelay = (targetDateTime) => {
  return Math.max(
    0,
    targetDateTime.toMillis() - Date.now()
  );
};

/* ------------------------------------------------------------------ */
/* Booking Confirmation                                               */
/* ------------------------------------------------------------------ */

export const scheduleBookingConfirmation = async (
  appointment
) => {
  const settings = await EmailSettings.getOrCreate();

  if (
    !settings.automationEnabled ||
    !settings.beforeAppointment.bookingConfirmation.enabled
  ) {
    return null;
  }

  const delay =
    settings.beforeAppointment.bookingConfirmation
      .delayMinutes * 60 * 1000;

  return enqueueEmail(
    {
      type: "booking-confirmation",
      appointmentId: appointment._id.toString(),
    },
    {
      jobId: getJobId(
        "booking-confirmation",
        appointment._id
      ),
      delay,
    }
  );
};

/* ------------------------------------------------------------------ */
/* Appointment Reminder                                               */
/* ------------------------------------------------------------------ */

export const scheduleAppointmentReminder = async (
  appointment
) => {
  const settings = await EmailSettings.getOrCreate();

  if (
    !settings.automationEnabled ||
    !settings.beforeAppointment.appointmentReminder.enabled
  ) {
    return null;
  }

  const timezone = settings.timezone;

  const appointmentStart = getAppointmentStart(
    appointment,
    timezone
  );

  const minutesBefore =
    settings.beforeAppointment.appointmentReminder
      .minutesBefore;

  const sendAt = appointmentStart.minus({
    minutes: minutesBefore,
  });

  const delay = calculateDelay(sendAt);

  return enqueueEmail(
    {
      type: "appointment-reminder",
      appointmentId: appointment._id.toString(),
    },
    {
      jobId: getJobId(
        "appointment-reminder",
        appointment._id
      ),
      delay,
    }
  );
};

/* ------------------------------------------------------------------ */
/* Thank You Email                                                    */
/* ------------------------------------------------------------------ */

export const scheduleThankYouEmail = async (
  appointment
) => {
  const settings = await EmailSettings.getOrCreate();

  if (
    !settings.automationEnabled ||
    !settings.afterAppointment.thankYou.enabled
  ) {
    return null;
  }

  const delay =
    settings.afterAppointment.thankYou.delayMinutes *
    60 *
    1000;

  return enqueueEmail(
    {
      type: "thank-you",
      appointmentId: appointment._id.toString(),
    },
    {
      jobId: getJobId(
        "thank-you",
        appointment._id
      ),
      delay,
    }
  );
};

/* ------------------------------------------------------------------ */
/* Review Request                                                     */
/* ------------------------------------------------------------------ */

export const scheduleReviewRequest = async (
  appointment
) => {
  const settings = await EmailSettings.getOrCreate();

  if (
    !settings.automationEnabled ||
    !settings.afterAppointment.reviewRequest.enabled
  ) {
    return null;
  }

  const delay =
    settings.afterAppointment.reviewRequest.delayMinutes *
    60 *
    1000;

  return enqueueEmail(
    {
      type: "review-request",
      appointmentId: appointment._id.toString(),
    },
    {
      jobId: getJobId(
        "review-request",
        appointment._id
      ),
      delay,
    }
  );
};

/* ------------------------------------------------------------------ */
/* Follow-up / Win-back                                               */
/* ------------------------------------------------------------------ */

export const scheduleFollowupWinback = async (
  appointment
) => {
  const settings = await EmailSettings.getOrCreate();

  if (
    !settings.automationEnabled ||
    !settings.followupWinback.enabled
  ) {
    return null;
  }

  const delay =
    settings.followupWinback.delayDays *
    24 *
    60 *
    60 *
    1000;

  return enqueueEmail(
    {
      type: "rebooking-followup",
      appointmentId: appointment._id.toString(),
    },
    {
      jobId: getJobId(
        "rebooking-followup",
        appointment._id
      ),
      delay,
    }
  );
};

/* ------------------------------------------------------------------ */
/* Cancel Appointment Email Jobs                                      */
/* ------------------------------------------------------------------ */

export const cancelAppointmentEmailJobs = async (
  appointmentId
) => {
  const id = appointmentId.toString();

  const jobTypes = [
    "booking-confirmation",
    "appointment-reminder",
    "thank-you",
    "review-request",
    "rebooking-followup",
  ];

  await Promise.all(
    jobTypes.map((type) =>
      cancelEmailJob(
        getJobId(type, id)
      )
    )
  );
};

/* ------------------------------------------------------------------ */
/* Reschedule Appointment                                             */
/* ------------------------------------------------------------------ */

export const rescheduleAppointmentEmails = async (
  appointment
) => {
  const id = appointment._id.toString();

  // Remove the old reminder.
  await cancelEmailJob(
    getJobId("appointment-reminder", id)
  );

  // Create a new reminder using the new appointment time.
  await scheduleAppointmentReminder(appointment);
};

/* ------------------------------------------------------------------ */
/* Schedule All Appointment Emails                                    */
/* ------------------------------------------------------------------ */

export const scheduleAppointmentEmails = async (
  appointment
) => {
  const results = {};

  results.bookingConfirmation =
    await scheduleBookingConfirmation(appointment);

  results.appointmentReminder =
    await scheduleAppointmentReminder(appointment);

  return results;
};

/* ------------------------------------------------------------------ */
/* Schedule Completion Emails                                         */
/* ------------------------------------------------------------------ */

export const scheduleCompletionEmails = async (
  appointment
) => {
  const results = {};

  results.thankYou =
    await scheduleThankYouEmail(appointment);

  results.reviewRequest =
    await scheduleReviewRequest(appointment);

  results.followupWinback =
    await scheduleFollowupWinback(appointment);

  return results;
};

/* ------------------------------------------------------------------ */
/* Verify Appointment Still Exists                                    */
/* ------------------------------------------------------------------ */

export const getAppointmentForEmailScheduling = async (
  appointmentId
) => {
  return Appointment.findById(appointmentId);
};