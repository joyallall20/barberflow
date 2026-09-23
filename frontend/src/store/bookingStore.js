import { create } from "zustand";

/*
 * RECONSTRUCTED FILE — not in the original upload.
 *
 * This was rebuilt from every `useBookingStore((s) => s.X)` call site found
 * across Booking.jsx, SlideServiceBarber.jsx, SlideDate.jsx, SlideTime.jsx,
 * SlideDetails/SlideConfirm.jsx and BookingSuccess.jsx. If your real store
 * has additional fields/actions (or different defaults), merge those in —
 * don't just overwrite your existing file with this one.
 */

const initialCustomer = { name: "", phone: "", email: "" };

const initialState = {
  step: 1,
  date: "",
  service: null,
  barber: null,
  time: "",
  customer: { ...initialCustomer },
  notes: "",
  booking: null,
};

const useBookingStore = create((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
  previousStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),

  setDate: (date) => set({ date }),

  // Barber/service determine availability, so changing either invalidates
  // any previously selected time (see SlideTime's fetch, which is keyed on
  // date + service + barber). We deliberately do NOT clear `date` here —
  // the date strip in this flow isn't barber/service-specific, it's just
  // "next 14 days minus Sundays" — so the chosen day is still valid, only
  // the time needs re-picking.
  setService: (service) => set({ service, time: "" }),
  setBarber: (barber) => set({ barber, time: "" }),

  setTime: (time) => set({ time }),

  setCustomer: (partial) =>
    set((s) => ({ customer: { ...s.customer, ...partial } })),
  setNotes: (notes) => set({ notes }),

  setBooking: (booking) => set({ booking }),

  // Resolves ?service= / ?barber= query params into store objects once the
  // catalog has loaded. Order-independent of which step is "first".
  hydrateFromQuery: ({ service, barber }) =>
    set((s) => ({
      service: service ?? s.service,
      barber: barber ?? s.barber,
    })),

  resetBooking: () =>
    set({
      ...initialState,
      customer: { ...initialCustomer },
    }),
}));

export default useBookingStore;