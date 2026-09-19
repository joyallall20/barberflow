import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Scissors,
  Users,
  UserCog,
  CreditCard,
  BarChart3,
  Briefcase,
  Percent,
  Megaphone,
  Workflow,
  LogOut,
  X,
} from "lucide-react";

import useAuthStore from "../../store/authStore";

const EASE = [0.22, 1, 0.36, 1];

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        path: "/admin",
      },
      {
        icon: Calendar,
        label: "Calendar",
        path: "/admin/calendar",
        comingSoon: true,
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        icon: ClipboardList,
        label: "Appointments",
        path: "/admin/appointments",
      },
      {
        icon: Scissors,
        label: "Services",
        path: "/admin/services",
      },
      {
        icon: Users,
        label: "Barbers",
        path: "/admin/barbers",
      },
      {
        icon: UserCog,
        label: "Clients",
        path: "/admin/customers",
      },
      {
        icon: Calendar,
        label: "Blocked Times",
        path: "/admin/blocked-times",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        icon: CreditCard,
        label: "Payments",
        comingSoon: true,
      },
      {
        icon: BarChart3,
        label: "Reports",
        comingSoon: true,
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        icon: Percent,
        label: "Commissions",
        comingSoon: true,
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        icon: Megaphone,
        label: "Campaigns",
        comingSoon: true,
      },
      {
        icon: Workflow,
        label: "Automations",
        comingSoon: true,
      },
    ],
  },
];

const AdminSidebar = ({ railOpen, onCloseRail }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const mongoUser = useAuthStore((s) => s.mongoUser);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const customerName = mongoUser?.name || "—";
  const customerEmail = mongoUser?.email || "—";

  return (
    <>
      {/* ---------- Left rail (desktop) ---------- */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-white/10 bg-[#0f0e0d] lg:block">
        <div className="border-b border-white/10 px-6 py-6">
          <Link to="/" className="group block">
            <div className="text-sm font-black tracking-[0.2em] text-[#e8e2d6] transition-colors group-hover:text-amber-500">
              THE FOUNDRY
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.35em] text-[#625f58]">
              Admin Console
            </div>
          </Link>
        </div>

        <nav className="px-3 py-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-6">
              <div className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
                {group.label}
              </div>

              <ul className="space-y-0.5">
                {group.items.map(({ icon: Icon, label, path, comingSoon }) => {
                  const isActive =
                    path &&
                    (location.pathname === path ||
                      location.pathname.startsWith(`${path}/`));

                  return (
                    <li key={label}>
                      <button
                        type="button"
                        disabled={comingSoon}
                        onClick={() => {
                          if (!path || comingSoon) return;
                          navigate(path);
                          onCloseRail();
                        }}
                        className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
                          isActive
                            ? "border-l-2 border-amber-500 bg-white/[0.03] text-amber-500"
                            : "border-l-2 border-transparent text-[#8f897e] hover:border-white/20 hover:text-[#e8e2d6]"
                        } ${
                          comingSoon
                            ? "cursor-not-allowed opacity-40"
                            : ""
                        }`}
                      >
                        <Icon size={14} className="flex-shrink-0" />
                        <span className="truncate">{label}</span>

                        {comingSoon && (
                          <span className="ml-auto text-[7px] tracking-[0.15em] text-[#625f58]">
                            SOON
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 px-6 py-5">
          <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
            Signed in as
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-[#e8e2d6]">
            {customerName}
          </div>
          <div className="truncate text-[10px] text-[#8f897e]">
            {customerEmail}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:text-amber-500"
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </aside>

      {/* ---------- Mobile rail drawer ---------- */}
      {railOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-black/60"
            onClick={onCloseRail}
          />

          <motion.aside
            initial={prefersReducedMotion ? false : { x: -280 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative h-full w-64 border-r border-white/10 bg-[#0f0e0d]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <Link to="/" onClick={onCloseRail}>
                <div className="text-sm font-black tracking-[0.2em] text-[#e8e2d6]">
                  THE FOUNDRY
                </div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[0.35em] text-[#625f58]">
                  Admin Console
                </div>
              </Link>

              <button
                type="button"
                onClick={onCloseRail}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="overflow-y-auto px-3 py-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="mb-6">
                  <div className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
                    {group.label}
                  </div>

                  <ul className="space-y-0.5">
                    {group.items.map(({ icon: Icon, label, path, comingSoon }) => {
                      const isActive =
                        path &&
                        (location.pathname === path ||
                          location.pathname.startsWith(`${path}/`));

                      return (
                        <li key={label}>
                          <button
                            type="button"
                            disabled={comingSoon}
                            onClick={() => {
                              if (!path || comingSoon) return;
                              navigate(path);
                              onCloseRail();
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
                              isActive
                                ? "border-l-2 border-amber-500 bg-white/[0.03] text-amber-500"
                                : "border-l-2 border-transparent text-[#8f897e] hover:border-white/20 hover:text-[#e8e2d6]"
                            } ${
                              comingSoon
                                ? "cursor-not-allowed opacity-40"
                                : ""
                            }`}
                          >
                            <Icon size={14} className="flex-shrink-0" />
                            <span className="truncate">{label}</span>

                            {comingSoon && (
                              <span className="ml-auto text-[7px] tracking-[0.15em] text-[#625f58]">
                                SOON
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              <div className="mt-8 border-t border-white/10 px-3 pt-5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:text-amber-500"
                >
                  <LogOut size={12} />
                  Logout
                </button>
              </div>
            </nav>
          </motion.aside>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;