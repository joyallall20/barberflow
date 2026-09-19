import api from "./api";
import API_PATH from "./apiPath";

// Services
export const getServices = async (params = {}) => {
  const response = await api.get(API_PATH.SERVICES, {
    params,
  });

  return response.data;
};

// Barbers
export const getBarbers = async (params = {}) => {
  const response = await api.get(API_PATH.BARBERS, {
    params,
  });

  return response.data;
};

// Availability
export const getAvailability = async ({
  barber,
  service,
  date,
}) => {
  const response = await api.get(API_PATH.AVAILABILITY, {
    params: {
      barber,
      service,
      date,
    },
  });

  return response.data;
};

// Appointments
export const createAppointment = async (data) => {
  const response = await api.post(
    API_PATH.APPOINTMENTS,
    data
  );

  return response.data;
};

export const getAppointment = async (id) => {
  const response = await api.get(
    `${API_PATH.APPOINTMENTS}/${id}`
  );

  return response.data;
};

// Customer appointments
// Customer appointments
export const getMyAppointments = async () => {
  const response = await api.get(
    `${API_PATH.APPOINTMENTS}/my`
  );

  return response.data;
};

export const cancelMyAppointment = async (
  id,
  cancellationReason = ""
) => {
  const response = await api.patch(
    `${API_PATH.APPOINTMENTS}/my/${id}/cancel`,
    { cancellationReason }
  );

  return response.data;
};