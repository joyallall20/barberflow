import api from "./api";
import API_PATH from "./apiPath";

/**
 * Get all active services available for booking.
 */
export const getBookingServices = async () => {
  const response = await api.get(API_PATH.SERVICES);

  return response.data;
};

/**
 * Get all active barbers available for booking.
 */
export const getBookingBarbers = async () => {
  const response = await api.get(API_PATH.BARBERS);

  return response.data;
};

/**
 * Get available appointment times.
 *
 * Expected params:
 * - date
 * - serviceId
 * - barberId (optional)
 */
export const getBookingAvailability = async ({
  date,
  serviceId,
  barberId,
}) => {
  const response = await api.get(API_PATH.AVAILABILITY, {
    params: {
      date,
      serviceId,
      ...(barberId ? { barberId } : {}),
    },
  });

  return response.data;
};

/**
 * Create a new appointment.
 */
export const createBooking = async (appointmentData) => {
  const response = await api.post(
    API_PATH.APPOINTMENTS,
    appointmentData
  );

  return response.data;
};