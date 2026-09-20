// src/services/paypal.service.js
import "dotenv/config";

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

/**
 * Get an OAuth2 access token from PayPal
 */
const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
};

/**
 * Verify a PayPal webhook signature
 * @param {object} args
 * @param {object} args.headers - req.headers
 * @param {Buffer} args.rawBody - raw request body Buffer
 * @returns {Promise<boolean>}
 */
export const verifyPaypalWebhook = async ({ headers, rawBody }) => {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      console.warn("PAYPAL_WEBHOOK_ID not set — skipping signature verification");
      return true; // Allow in dev only; remove in production
    }

    const accessToken = await getAccessToken();

    const verificationBody = {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody.toString("utf8")),
    };

    const res = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verificationBody),
      }
    );

    if (!res.ok) {
      console.error("PayPal verify-webhook failed:", res.status);
      return false;
    }

    const data = await res.json();
    return data.verification_status === "SUCCESS";
  } catch (error) {
    console.error("verifyPaypalWebhook error:", error);
    return false;
  }
};

/**
 * Create a PayPal order
 */
export const createPaypalOrder = async ({ amount, currency = "USD", referenceId }) => {
  const accessToken = await getAccessToken();

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: currency, value: Number(amount).toFixed(2) },
          reference_id: referenceId,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal createOrder failed: ${res.status} ${errText}`);
  }

  return res.json();
};

/**
 * Capture a PayPal order
 */
export const capturePaypalOrder = async (orderId) => {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal captureOrder failed: ${res.status} ${errText}`);
  }

  return res.json();
};

/**
 * Refund a captured payment
 * @param {string} captureId - PayPal capture id
 * @param {number} [amount] - optional partial refund amount
 * @param {string} [currency]
 */
export const refundPaypalCapture = async (captureId, amount, currency = "USD") => {
  const accessToken = await getAccessToken();

  const body = {};
  if (amount !== undefined) {
    body.amount = { value: Number(amount).toFixed(2), currency_code: currency };
  }

  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal refund failed: ${res.status} ${errText}`);
  }

  return res.json();
};