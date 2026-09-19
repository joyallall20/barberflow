import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

/**
 * Route guard.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/my-appointments" element={<MyAppointments />} />
 *   </Route>
 *
 *   <Route element={<ProtectedRoute roles={["admin", "owner"]} />}>
 *     <Route path="/admin" element={<AdminDashboard />} />
 *   </Route>
 *
 * Props:
 *   roles?: string[]   Optional allow-list. If omitted, any authenticated
 *                      user passes. If provided, the user's role must be
 *                      in the list, otherwise they're bounced to their
 *                      own home.
 */
const ProtectedRoute = ({ roles }) => {
  const location = useLocation();

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);

  // Wait for Firebase boot + backend identity fetch.
  // Prevents flashing /login during a valid session restore.
  if (loading || (user && bootstrapping)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141311]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin border border-white/20 border-t-amber-500" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated → send to /login, remembering where they wanted to go.
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Authenticated but backend identity not resolved yet.
  // (Rare — only if a session restore partially failed.)
  if (!role && roles && roles.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141311] px-6 text-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            The Foundry
          </p>
          <p className="mt-3 text-sm text-[#aaa398]">
            We couldn&apos;t verify your account. Please sign in again.
          </p>
          <a
            href="/login"
            className="mt-5 inline-block bg-amber-500 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-amber-400"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  // Role-gated route and user's role isn't allowed → bounce to their home.
  if (roles && roles.length > 0 && !roles.includes(role)) {
    let home = "/my-appointments";
    
    if (role === "admin" || role === "owner") {
      home = "/admin";
    } else if (role === "barber") {
      home = "/barber";
    }

    return <Navigate to={home} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;