import { Routes, Route } from "react-router-dom";

import AuthInitializer from "./auth/AuthInitializer";
import ProtectedRoute from "./auth/ProtectedRoute";
import PublicLayout from "./components/layout/PublicLayout";

// Public pages
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import BookingSuccess from "./pages/BookingSuccess";
import MyAppointments from "./pages/MyAppointments";
import Login from "./pages/Login";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import DashboardPage from "./admin/dashboard/DashboardPage";
import AppointmentsPage from "./pages/admin/AppointmentsPage";
import ServicesPage from "./pages/admin/ServicesPage";
import BarbersPage from "./pages/admin/BarbersPage";
import CustomersPage from "./pages/admin/CustomersPage";
import BlockedTimesPage from "./pages/admin/BlockedTimesPage";

// Barber pages
import BarberLayout from "./pages/barber/BarberLayout";
import BarberDashboardPage from "./pages/barber/BarberDashboardPage";
import BarberAppointmentsPage from "./pages/barber/BarberAppointmentsPage";
import BarberSchedulePage from "./pages/barber/BarberSchedulePage";
import BarberProfilePage from "./pages/barber/BarberProfilePage";

const App = () => {
  return (
    <>
      <AuthInitializer />

      <Routes>
        {/* ============================================================
            PUBLIC
        ============================================================ */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Booking />} />
          <Route
            path="/booking/success"
            element={<BookingSuccess />}
          />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* ============================================================
            CUSTOMER
        ============================================================ */}
        <Route
          element={
            <ProtectedRoute
              roles={["customer", "admin", "owner"]}
            />
          }
        >
          <Route
            path="/my-appointments"
            element={<MyAppointments />}
          />
        </Route>

        {/* ============================================================
            ADMIN / OWNER
        ============================================================ */}
        <Route
          element={
            <ProtectedRoute
              roles={["admin", "owner"]}
            />
          }
        >
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<DashboardPage />} />

            <Route
              path="appointments"
              element={<AppointmentsPage />}
            />

            <Route
              path="services"
              element={<ServicesPage />}
            />

            <Route
              path="barbers"
              element={<BarbersPage />}
            />

            <Route
              path="customers"
              element={<CustomersPage />}
            />

            <Route
              path="blocked-times"
              element={<BlockedTimesPage />}
            />
          </Route>
        </Route>

        {/* ============================================================
            BARBER
        ============================================================ */}
        <Route
          element={
            <ProtectedRoute
              roles={["barber"]}
            />
          }
        >
          <Route path="/barber" element={<BarberLayout />}>
            {/* /barber */}
            <Route
              index
              element={<BarberDashboardPage />}
            />

            {/* /barber/appointments */}
            <Route
              path="appointments"
              element={<BarberAppointmentsPage />}
            />

            {/* /barber/schedule */}
            <Route
              path="schedule"
              element={<BarberSchedulePage />}

            />
            
 
  <Route
    path="profile"
    element={<BarberProfilePage />}
  />


            

            
          </Route>
        </Route>
      </Routes>
    </>
  );
};

export default App;