import { create } from "zustand";

const useUIStore = create((set) => ({
  mobileMenuOpen: false,
  bookingModalOpen: false,

  setMobileMenuOpen: (open) => {
    set({
      mobileMenuOpen: open,
    });
  },

  toggleMobileMenu: () => {
    set((state) => ({
      mobileMenuOpen: !state.mobileMenuOpen,
    }));
  },

  closeMobileMenu: () => {
    set({
      mobileMenuOpen: false,
    });
  },

  openBookingModal: () => {
    set({
      bookingModalOpen: true,
    });
  },

  closeBookingModal: () => {
    set({
      bookingModalOpen: false,
    });
  },
}));

export default useUIStore;