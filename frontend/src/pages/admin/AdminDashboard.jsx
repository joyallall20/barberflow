import { useState } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { Menu } from "lucide-react";

import useAuthStore from "../../store/authStore";
import AdminSidebar, { NAV_GROUPS } from "./AdminSidebar";

const AdminDashboard = () => {
  const location = useLocation();

  const currentNav =
    NAV_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        group: group.label,
      }))
    ).find(
      (item) =>
        item.path &&
        (location.pathname === item.path ||
          location.pathname.startsWith(`${item.path}/`))
    ) || {
      label: "Dashboard",
      group: "Overview",
    };

  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);

  const [railOpen, setRailOpen] = useState(false);

  // Soft guard — a customer shouldn't reach this page, but if they do,
  // send them home rather than showing an empty admin shell.
  if (!loading && !bootstrapping && role && role !== "admin" && role !== "owner") {
    return <Navigate to="/my-appointments" replace />;
  }

  const roleLabel = role === "owner" ? "Owner" : "Admin";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#141311] text-[#e8e2d6]">
      {/* Background wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="whitespace-nowrap text-[22vw] font-black uppercase leading-none text-white/[0.015]">
          Admin
        </span>
      </div>

      <div className="relative z-10 flex min-h-screen">
        <AdminSidebar
          railOpen={railOpen}
          onCloseRail={() => setRailOpen(false)}
        />

        {/* ---------- Main column ---------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex items-center justify-between border-b border-white/10 px-6 py-5 lg:px-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setRailOpen(true)}
                aria-label="Open admin navigation"
                className="flex h-10 w-10 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 lg:hidden"
              >
                <Menu size={18} />
              </button>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                  {currentNav.group}
                </div>

                <div className="mt-0.5 text-lg font-extrabold uppercase leading-none tracking-tight">
                  {currentNav.label}
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <span className="border border-amber-500/40 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-500">
                {roleLabel}
              </span>
              <a
                href="/"
                className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:text-amber-500"
              >
                View site →
              </a>
            </div>
          </header>

          {/* Content */}
          <section className="flex-1 px-6 py-10 lg:px-10 lg:py-12">
            <Outlet />
          </section>
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;