
import api from "./api";
import API_PATH from "./apiPath";

const reviewQRService = {
  /**
   * Create a review QR code for a barber.
   * Returns the raw token only when created.
   */
  create: async (barberId) => {
    const response = await api.post(
      `${API_PATH.ADMIN.BARBERS}/${encodeURIComponent(barberId)}/review-qr`
    );
    return response.data;
  },

  get: async (barberId) => {
    const response = await api.get(
      `${API_PATH.ADMIN.BARBERS}/${encodeURIComponent(barberId)}/review-qr`
    );
    return response.data;
  },

  regenerate: async (barberId) => {
    const response = await api.post(
      `${API_PATH.ADMIN.BARBERS}/${encodeURIComponent(barberId)}/review-qr/regenerate`
    );
    return response.data;
  },

  updateStatus: async (barberId, active) => {
    if (typeof active !== "boolean") {
      throw new Error("QR status must be a boolean");
    }
    const response = await api.patch(
      `${API_PATH.ADMIN.BARBERS}/${encodeURIComponent(barberId)}/review-qr/status`,
      { active }
    );
    return response.data;
  },

  /**
   * Resolve a public QR token.
   * Used by the customer-facing QR landing page.
   */
  resolve: async (token) => {
    if (!token || typeof token !== "string") {
      throw new Error("A valid QR token is required");
    }

    const response = await api.get(
      API_PATH.REVIEWS.QR_RESOLVE(token)
    );

    return response.data;
  },
};

export default reviewQRService;