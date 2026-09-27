
import { create } from "zustand";

import {
  getBarberReviewQR,
  createBarberReviewQR,
  regenerateBarberReviewQR,
  updateBarberReviewQRStatus,
} from "../services/admin";

const useReviewQRStore = create((set) => ({
  // State
  qr: null,
  loading: false,
  creating: false,
  regenerating: false,
  updatingStatus: false,
  error: null,

  // Fetch existing QR metadata for a barber
  fetchQR: async (barberId) => {
    if (!barberId) {
      set({ error: "Barber ID is required." });
      return null;
    }

    set({ loading: true, error: null });

    try {
      const response = await getBarberReviewQR(barberId);

      set({
        qr: response,
        loading: false,
        error: null,
      });

      return response;
    } catch (error) {
      // A 404 means no QR has been created yet.
      if (error?.isNotFound || error?.status === 404) {
        set({
          qr: null,
          loading: false,
          error: null,
        });

        return null;
      }

      set({
        loading: false,
        error: error?.message || "Failed to load review QR.",
      });

      throw error;
    }
  },

  // Create a new QR
  createQR: async (barberId) => {
    if (!barberId) {
      set({ error: "Barber ID is required." });
      throw new Error("Barber ID is required.");
    }

    set({ creating: true, error: null });

    try {
      const response = await createBarberReviewQR(barberId);

      set({
        qr: response,
        creating: false,
        error: null,
      });

      // Return the original response, including any newly issued token.
      return response;
    } catch (error) {
      set({
        creating: false,
        error: error?.message || "Failed to create review QR.",
      });

      throw error;
    }
  },

  // Regenerate QR and replace the previous token
  regenerateQR: async (barberId) => {
    if (!barberId) {
      set({ error: "Barber ID is required." });
      throw new Error("Barber ID is required.");
    }

    set({ regenerating: true, error: null });

    try {
      const response = await regenerateBarberReviewQR(barberId);

      set({
        qr: response,
        regenerating: false,
        error: null,
      });

      return response;
    } catch (error) {
      set({
        regenerating: false,
        error: error?.message || "Failed to regenerate review QR.",
      });

      throw error;
    }
  },

  // Enable or disable an existing QR
  toggleQRStatus: async (barberId, active) => {
    if (!barberId) {
      set({ error: "Barber ID is required." });
      throw new Error("Barber ID is required.");
    }

    if (typeof active !== "boolean") {
      set({ error: "A valid QR status is required." });
      throw new Error("A valid QR status is required.");
    }

    set({ updatingStatus: true, error: null });

    try {
      const response = await updateBarberReviewQRStatus(
        barberId,
        active
      );

      set({
        qr: response,
        updatingStatus: false,
        error: null,
      });

      return response;
    } catch (error) {
      set({
        updatingStatus: false,
        error: error?.message || "Failed to update QR status.",
      });

      throw error;
    }
  },

  // Clear errors without discarding QR data
  clearError: () => set({ error: null }),

  // Reset when the modal closes or barber changes
  reset: () =>
    set({
      qr: null,
      loading: false,
      creating: false,
      regenerating: false,
      updatingStatus: false,
      error: null,
    }),
}));

export default useReviewQRStore;0