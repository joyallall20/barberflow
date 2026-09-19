import api from "./api";
import API_PATH from "./apiPath";

export const getBookingServices = async () => {
  const response = await api.get(API_PATH.SERVICES);

  return response.data;
};

export const getBookingBarbers = async () => {
  const response = await api.get(API_PATH.BARBERS);

  return response.data;
};

export const getBookingAvailability = async ({
  date,
  service,
  barber,
}) => {
  const response = await api.get(API_PATH.AVAILABILITY, {
    params: {
      date,
      service,
      barber,
    },
  });

  // Backend response:
  // {
  //   success: true,
  //   message: "...",
  //   data: {
  //     date,
  //     barber,
  //     service,
  //     slots: [...]
  //   }
  // }
  //
  // Return the actual availability data so SlideTime
  // can consume `res.slots` directly.
  return response.data?.data ?? response.data;
};

export const createBooking = async (appointmentData) => {
  const response = await api.post(
    API_PATH.APPOINTMENTS,
    appointmentData
  );

  return response.data;
};