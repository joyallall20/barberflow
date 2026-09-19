import api from "./api";
import API_PATH from "./apiPath";

// --------------------------------------------------
// Barber Self-Service API
// --------------------------------------------------

export const getMyBarberProfile = async () => {
  const response = await api.get(API_PATH.BARBER.PROFILE);
  return response.data;
};

export const updateMyBarberProfile = async (data) => {
  const response = await api.patch(API_PATH.BARBER.PROFILE, data);
  return response.data;
};

export const uploadMyBarberPhoto = async (formData) => {
  const response = await api.post(API_PATH.BARBER.PHOTO, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateMyWorkingHours = async (workingHours) => {
  const response = await api.put(API_PATH.BARBER.WORKING_HOURS, {
    workingHours,
  });
  return response.data;
};

export const getMyAppointments = async (params = {}) => {
  const response = await api.get(API_PATH.BARBER.APPOINTMENTS, { params });
  return response.data;
};

export const getMyDashboardOverview = async () => {
  const response = await api.get(API_PATH.BARBER.DASHBOARD_OVERVIEW);
  return response.data;
};
