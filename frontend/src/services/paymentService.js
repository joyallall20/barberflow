

import api from "./api";
import API_PATH from "./apiPath";

/**
 * Create a server-side payment + PayPal order.
 *
 * The backend is authoritative for:
 * - amount
 * - currency
 * - customer
 * - barber
 * - payment type
 * - provider
 *
 * The frontend sends only the appointment ID.
 */
export const createPayment = async (appointmentId) => {
  const response = await api.post(API_PATH.PAYMENTS.CREATE, {
    appointment: appointmentId,
  });

  return response.data;
};

/**
 * Ask the backend to verify and capture a PayPal order.
 *
 * The frontend provides only:
 * - payment ID
 * - PayPal order ID returned by PayPal
 *
 * The backend verifies the order, amount, currency,
 * ownership and capture before marking payment completed.
 */
export const capturePayment = async (paymentId, orderId) => {
  const response = await api.post(
    API_PATH.PAYMENTS.CAPTURE(paymentId),
    {
      orderId,
    }
  );

  return response.data;
};