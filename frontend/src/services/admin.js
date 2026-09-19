import api from "./api";
import API_PATH from "./apiPath";

// --------------------------------------------------
// Dashboard
// --------------------------------------------------

export const getDashboardOverview = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.DASHBOARD.OVERVIEW, {
    params,
  });

  return response.data;
};

export const getTodayAppointments = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.DASHBOARD.TODAY, {
    params,
  });

  return response.data;
};

export const getUpcomingAppointments = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.DASHBOARD.UPCOMING, {
    params,
  });

  return response.data;
};

export const getWeeklyStats = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.DASHBOARD.WEEKLY, {
    params,
  });

  return response.data;
};

export const getRevenueStats = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.DASHBOARD.REVENUE, {
    params,
  });

  return response.data;
};

// --------------------------------------------------
// Appointments
// --------------------------------------------------

export const getAdminAppointments = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.APPOINTMENTS, {
    params,
  });

  return response.data;
};

export const getAdminAppointment = async (id) => {
  const response = await api.get(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}`
  );

  return response.data;
};

export const updateAdminAppointment = async (id, data) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}`,
    data
  );

  return response.data;
};

export const confirmAdminAppointment = async (id) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}/confirm`
  );

  return response.data;
};

export const completeAdminAppointment = async (id) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}/complete`
  );

  return response.data;
};

export const markAdminAppointmentNoShow = async (id) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}/no-show`
  );

  return response.data;
};

export const cancelAdminAppointment = async (id, data = {}) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}/cancel`,
    data
  );

  return response.data;
};

export const rescheduleAdminAppointment = async (id, data) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}/reschedule`,
    data
  );

  return response.data;
};

export const deleteAdminAppointment = async (id) => {
  const response = await api.delete(
    `${API_PATH.ADMIN.APPOINTMENTS}/${id}`
  );

  return response.data;
};

// --------------------------------------------------
// Customers
// --------------------------------------------------

export const getAdminCustomers = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.CUSTOMERS, {
    params,
  });

  return response.data;
};

export const getAdminCustomer = async (id) => {
  const response = await api.get(
    `${API_PATH.ADMIN.CUSTOMERS}/${id}`
  );

  return response.data;
};

export const updateAdminCustomer = async (id, data) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.CUSTOMERS}/${id}`,
    data
  );

  return response.data;
};



// --------------------------------------------------
// Services
// --------------------------------------------------

export const getAdminServices = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.SERVICES, {
    params,
  });

  return response.data;
};

export const createService = async (data) => {
  const response = await api.post(
    API_PATH.ADMIN.SERVICES,
    data
  );

  return response.data;
};

export const updateService = async (id, data) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.SERVICES}/${id}`,
    data
  );

  return response.data;
};

export const deleteService = async (id) => {
  const response = await api.delete(
    `${API_PATH.ADMIN.SERVICES}/${id}`
  );

  return response.data;
};

// --------------------------------------------------
// Barbers
// --------------------------------------------------

export const getAdminBarbers = async (params = {}) => {
  const response = await api.get(API_PATH.ADMIN.BARBERS, {
    params,
  });

  return response.data;
};

export const createBarber = async (data) => {
  const response = await api.post(
    API_PATH.ADMIN.BARBERS,
    data
  );

  return response.data;
};

export const updateBarber = async (id, data) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.BARBERS}/${id}`,
    data
  );

  return response.data;
};

export const deleteBarber = async (id) => {
  const response = await api.delete(
    `${API_PATH.ADMIN.BARBERS}/${id}`
  );

  return response.data;
};

export const updateBarberWorkingHours = async (
  id,
  workingHours
) => {
  const response = await api.put(
    `${API_PATH.ADMIN.BARBERS}/${id}/working-hours`,
    { workingHours }
  );

  return response.data;
};

export const uploadBarberPhoto = async (id, formData) => {
  const response = await api.post(
    `${API_PATH.ADMIN.BARBERS}/${id}/photo`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const toggleBarberStatus = async (id) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.BARBERS}/${id}/status`
  );
  return response.data;
};

// --------------------------------------------------
// Blocked Times
// --------------------------------------------------

export const getBlockedTimes = async (params = {}) => {
  const response = await api.get(
    API_PATH.ADMIN.BLOCKED_TIMES,
    {
      params,
    }
  );

  return response.data;
};

export const getBlockedTime = async (id) => {
  const response = await api.get(
    `${API_PATH.ADMIN.BLOCKED_TIMES}/${id}`
  );

  return response.data;
};

export const createBlockedTime = async (data) => {
  const response = await api.post(
    API_PATH.ADMIN.BLOCKED_TIMES,
    data
  );

  return response.data;
};

export const updateBlockedTime = async (id, data) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.BLOCKED_TIMES}/${id}`,
    data
  );

  return response.data;
};

export const deleteBlockedTime = async (id) => {
  const response = await api.delete(
    `${API_PATH.ADMIN.BLOCKED_TIMES}/${id}`
  );

  return response.data;
};

// --------------------------------------------------
// Recurring Blocked Times
// --------------------------------------------------

export const getRecurringBlockedTimes = async (params = {}) => {
  const response = await api.get(
    API_PATH.ADMIN.RECURRING_BLOCKED_TIMES,
    {
      params,
    }
  );

  return response.data;
};

export const createRecurringBlockedTime = async (data) => {
  const response = await api.post(
    API_PATH.ADMIN.RECURRING_BLOCKED_TIMES,
    data
  );

  return response.data;
};

export const updateRecurringBlockedTime = async (id, data) => {
  const response = await api.patch(
    `${API_PATH.ADMIN.RECURRING_BLOCKED_TIMES}/${id}`,
    data
  );

  return response.data;
};

export const deleteRecurringBlockedTime = async (id) => {
  const response = await api.delete(
    `${API_PATH.ADMIN.RECURRING_BLOCKED_TIMES}/${id}`
  );

  return response.data;
};