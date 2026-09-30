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
  const response = await api.patch(
    API_PATH.BARBER.PROFILE,
    data
  );
  return response.data;
};

export const uploadMyBarberPhoto = async (formData) => {
  const response = await api.post(
    API_PATH.BARBER.PHOTO,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const updateMyWorkingHours = async (workingHours) => {
  const response = await api.put(
    API_PATH.BARBER.WORKING_HOURS,
    {
      workingHours,
    }
  );

  return response.data;
};

export const getMyAppointments = async (params = {}) => {
  const response = await api.get(
    API_PATH.BARBER.APPOINTMENTS,
    { params }
  );

  return response.data;
};

export const getMyDashboardOverview = async () => {
  const response = await api.get(
    API_PATH.BARBER.DASHBOARD_OVERVIEW
  );

  return response.data;
};

// --------------------------------------------------
// Barber Reviews & QR
// --------------------------------------------------

/**
 * Fetches the authenticated barber's own review QR information.
 *
 * Endpoint: GET /api/barber/review-qr (API_PATH.BARBER.REVIEW_QR)
 *
 * The backend determines the barber from the authenticated
 * user. No barber ID is sent from the frontend.
 *
 * Verified response fields (from the ReviewQR model):
 *   publicId  — permanent public identifier used in the review URL
 *   active    — whether the QR is currently enabled
 *   createdAt — initial QR creation timestamp
 */
export const getMyReviewQR = async () => {
  const response = await api.get(
    API_PATH.BARBER.REVIEW_QR
  );

  return response.data;
};

/**
 * Fetches the barber's approved public reviews.
 *
 * Endpoint: GET /api/barbers/:barberId/reviews
 * Public endpoint — returns only approved reviews with customer name populated.
 *
 * Response shape: { reviews: [...], total, page, limit }
 */
export const getMyBarberReviews = async (barberId) => {
  const response = await api.get(
    `${API_PATH.BARBERS}/${barberId}/reviews`
  );

  return response.data;
};