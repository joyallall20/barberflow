
import SibApiV3Sdk from "@sendinblue/client";

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const apiKey = process.env.BREVO_API_KEY;

if (apiKey && apiKey !== "your_brevo_api_key") {
  apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    apiKey
  );
}

const sender = {
  email: process.env.BREVO_SENDER_EMAIL,
  name: process.env.BREVO_SENDER_NAME || "The Foundry",
};

const isConfigured = () =>
  Boolean(
    apiKey &&
      apiKey !== "your_brevo_api_key" &&
      sender.email &&
      sender.email !== "your_verified_sender_email"
  );

/**
 * Sends a transactional email through Brevo.
 *
 * Throws on failure so BullMQ can retry the job.
 * Never silently reports a failed email as sent.
 */
export const sendEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
  tags = [],
}) => {
  if (!isConfigured()) {
    throw new Error(
      "Brevo is not configured. Check BREVO_API_KEY and sender settings."
    );
  }

  if (!to || !subject || (!htmlContent && !textContent)) {
    throw new Error(
      "Email requires a recipient, subject, and email content."
    );
  }

  const recipients = Array.isArray(to) ? to : [to];

  const validRecipients = recipients.every(
    (recipient) =>
      typeof recipient === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())
  );

  if (!validRecipients) {
    throw new Error("One or more email addresses are invalid.");
  }

  const email = new SibApiV3Sdk.SendSmtpEmail();

  email.sender = sender;
  email.to = recipients.map((address) => ({
    email: address.trim(),
  }));
  email.subject = subject;

  if (htmlContent) {
    email.htmlContent = htmlContent;
  }

  if (textContent) {
    email.textContent = textContent;
  }

  if (tags.length > 0) {
    email.tags = tags;
  }

  const response = await apiInstance.sendTransacEmail(email);

  return {
    messageId: response?.body?.messageId || null,
    accepted: true,
  };
};

export const isEmailConfigured = isConfigured;