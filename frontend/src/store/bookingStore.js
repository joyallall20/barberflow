import { create } from "zustand";

const initialState = {
  step: 1,
  service: null,
  barber: null,
  date: "",
  time: "",
  customer: {
    name: "",
    phone: "",
    email: "",
  },
  notes: "",
  booking: null,
};

const useBookingStore = create((set) => ({
  ...initialState,

  setStep: (step) => {
    set({ step });
  },

  nextStep: () => {
    set((state) => ({
      step: Math.min(4, state.step + 1),
    }));
  },

  previousStep: () => {
    set((state) => ({
      step: Math.max(1, state.step - 1),
    }));
  },

  // Changing service invalidates the previously selected time,
  // but preserves date and barber so the user doesn't lose work.
  setService: (service) => {
    set({
      service,
      time: "",
    });
  },

  // Changing barber invalidates the previously selected time,
  // but preserves date and service.
  setBarber: (barber) => {
    set({
      barber,
      time: "",
    });
  },

  setDate: (date) => {
    set({
      date,
      time: "",
    });
  },

  setTime: (time) => {
    set({ time });
  },

  setCustomer: (customer) => {
    set((state) => ({
      customer: {
        ...state.customer,
        ...customer,
      },
    }));
  },

  setNotes: (notes) => {
    set({ notes });
  },

  setBooking: (booking) => {
    set({ booking });
  },

  /**
   * Atomic preselect from URL query.
   * Called once on /book mount with values parsed from useSearchParams.
   *
   * Accepts slugs or IDs depending on how the caller resolves them.
   * Does NOT clear anything the user has already set interactively.
   */
  hydrateFromQuery: ({ service, barber } = {}) => {
    set((state) => {
      const next = {};
      if (service && service !== state.service) next.service = service;
      if (barber && barber !== state.barber) next.barber = barber;
      // Any change to service/barber invalidates a previously chosen time
      if (Object.keys(next).length > 0) next.time = "";
      return next;
    });
  },

  resetBooking: () => {
    set(initialState);
  },
}));

export default useBookingStore;