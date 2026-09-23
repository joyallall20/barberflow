const API_PATH = {
  // Self-service auth (any authenticated user, own account only)
  ME: "/me",
  ME_SYNC: "/me/sync",

  // Public
  SERVICES: "/services",
  BARBERS: "/barbers",
  AVAILABILITY: "/availability",
  APPOINTMENTS: "/appointments",

  // Payments
  PAYMENTS: {
    CREATE: "/payments",
    CAPTURE: (id) => `/payments/${id}/capture`,
  },

  // Admin
  ADMIN: {
    SERVICES: "/admin/services",
    BARBERS: "/admin/barbers",
    CUSTOMERS: "/admin/customers",
    APPOINTMENTS: "/admin/appointments",
    BLOCKED_TIMES: "/admin/blocked-times",
    RECURRING_BLOCKED_TIMES: "/admin/recurring-blocked-times",

    DASHBOARD: {
      OVERVIEW: "/admin/dashboard/overview",
      TODAY: "/admin/dashboard/today",
      UPCOMING: "/admin/dashboard/upcoming",
      WEEKLY: "/admin/dashboard/weekly",
      REVENUE: "/admin/dashboard/revenue",
    },
  },

  // Barber Self-Service
  BARBER: {
    PROFILE: "/barber/profile",
    PHOTO: "/barber/photo",
    WORKING_HOURS: "/barber/working-hours",
    APPOINTMENTS: "/barber/appointments",
    DASHBOARD_OVERVIEW: "/barber/dashboard/overview",
  },
};

export default API_PATH;