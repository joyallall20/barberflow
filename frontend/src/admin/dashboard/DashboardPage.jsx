import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Plus, Scissors, Users, CalendarOff } from "lucide-react";
import { toast } from "sonner";

import useAuthStore from "../../store/authStore";
import {
  getDashboardOverview,
  getTodayAppointments,
  getUpcomingAppointments,
  getWeeklyStats,
  getRevenueStats,
} from "../../services/admin.js";

import DashboardStats from "./DashboardStats";
import TodaySchedule from "./TodaySchedule";
import UpcomingAppointments from "./UpcomingAppointments";
import WeeklyBookings from "./WeeklyBookings";
import RevenueOverview from "./RevenueOverview";
import AppointmentDrawer from "../appointments/AppointmentDrawer";

const EASE = [0.22, 1, 0.36, 1];
const SECTION_KEYS = ["overview", "today", "upcoming", "weekly", "revenue"];

const FETCHERS = {
  overview: getDashboardOverview,
  today: getTodayAppointments,
  upcoming: getUpcomingAppointments,
  weekly: getWeeklyStats,
  revenue: getRevenueStats,
};

const ERROR_LABEL = {
  overview: "key statistics",
  today: "today's schedule",
  upcoming: "upcoming appointments",
  weekly: "weekly activity",
  revenue: "revenue overview",
};

const QUICK_ACTIONS = [
  { label: "New Appointment", to: "/admin/appointments/new", icon: Plus },
  { label: "New Service", to: "/admin/services/new", icon: Scissors },
  { label: "New Barber", to: "/admin/barbers/new", icon: Users },
  { label: "Block Time", to: "/admin/blocked-times/new", icon: CalendarOff },
];

const DashboardPage = () => {
  const prefersReducedMotion = useReducedMotion();
  const mongoUser = useAuthStore((s) => s.mongoUser);
  const firstName = (mongoUser?.name || "there").split(" ")[0];

  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [revenueGroupBy, setRevenueGroupBy] = useState("day");
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(Object.fromEntries(SECTION_KEYS.map((k) => [k, true])));
    setErrors({});

    const results = await Promise.allSettled([
      FETCHERS.overview(),
      FETCHERS.today(),
      FETCHERS.upcoming(),
      FETCHERS.weekly(),
      FETCHERS.revenue({ groupBy: revenueGroupBy }),
    ]);

    const nextData = {};
    const nextErrors = {};

    results.forEach((result, i) => {
      const key = SECTION_KEYS[i];
      if (result.status === "fulfilled") {
        nextData[key] = result.value;
      } else {
        nextErrors[key] = true;
        toast.error(`Couldn't load ${ERROR_LABEL[key]}.`);
      }
    });

    setData((prev) => ({ ...prev, ...nextData }));
    setErrors(nextErrors);
    setLoading(Object.fromEntries(SECTION_KEYS.map((k) => [k, false])));
  }, [revenueGroupBy]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const anyLoading = SECTION_KEYS.some((k) => loading[k]);

  return (
    <div>
      {/* Header / Welcome */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Overview
          </div>
          <h1 className="max-w-2xl text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
            Welcome back,
            <br />
            <span className="text-[#8f897e]">{firstName}.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
            Here&apos;s what&apos;s happening at The Foundry today.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAll}
          disabled={anyLoading}
          className="flex items-center gap-2 self-start border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
        >
          <RefreshCw size={13} className={anyLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </motion.div>

      {/* Key statistics */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          Key statistics
        </div>
        <DashboardStats data={data.overview} loading={loading.overview} error={errors.overview} />
      </div>

      {/* Today's schedule */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          Today&apos;s schedule
        </div>
        <TodaySchedule
          data={data.today}
          loading={loading.today}
          error={errors.today}
          onSelect={setSelectedAppointment}
        />
      </div>

      {/* Upcoming appointments */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          Upcoming appointments
        </div>
        <UpcomingAppointments data={data.upcoming} loading={loading.upcoming} error={errors.upcoming} />
      </div>

      {/* Weekly activity */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          Weekly activity
        </div>
        <WeeklyBookings data={data.weekly} loading={loading.weekly} error={errors.weekly} />
      </div>

      {/* Revenue */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
            Revenue ({revenueGroupBy})
          </div>
          <div className="flex gap-1">
            {["day", "week", "month"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setRevenueGroupBy(g)}
                className={`px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                  revenueGroupBy === g
                    ? "bg-amber-500 text-black"
                    : "border border-white/10 text-[#8f897e] hover:text-[#e8e2d6]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <RevenueOverview data={data.revenue} loading={loading.revenue} error={errors.revenue} />
      </div>

      {/* Quick actions */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/5 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-start gap-3 bg-[#141311] p-5 transition-colors hover:bg-white/[0.03]"
            >
              <Icon size={16} className="text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <AppointmentDrawer
        appointment={selectedAppointment}
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
      />
    </div>
  );
};

export default DashboardPage;