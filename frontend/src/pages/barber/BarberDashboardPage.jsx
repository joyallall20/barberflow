import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import useAuthStore from "../../store/authStore";
import {
  getMyDashboardOverview,
  getMyBarberProfile,
} from "../../services/barberService";

const EASE = [0.22, 1, 0.36, 1];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */
const STATUS_STYLES = {
  pending: "border-amber-500/30 text-amber-500",
  confirmed: "border-amber-500/30 text-amber-500",
  completed: "border-emerald-500/30 text-emerald-500",
  cancelled: "border-[#625f58] text-[#625f58]",
  no_show: "border-red-500/30 text-red-400",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-block border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] ${
      STATUS_STYLES[status] || "border-white/10 text-[#8f897e]"
    }`}
  >
    {status?.replace("_", " ") || "—"}
  </span>
);

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */
const StatCard = ({ icon: Icon, label, value, delay, prefersReducedMotion }) => (
  <motion.div
    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: EASE }}
    className="border border-white/10 bg-white/[0.02] p-5"
  >
    <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
      <Icon size={13} className="text-amber-500" />
      {label}
    </div>
    <div className="mt-3 text-2xl font-extrabold tracking-tight text-[#e8e2d6]">
      {value}
    </div>
  </motion.div>
);

/* ------------------------------------------------------------------ */
/* Appointment row                                                     */
/* ------------------------------------------------------------------ */
const AppointmentRow = ({ appt, index, prefersReducedMotion }) => {
  const customerName = appt.customer?.name || "Client";
  const serviceName = appt.service?.name || "Service";
  const duration = appt.service?.duration;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE }}
      className="flex items-center gap-4 border-b border-white/5 px-4 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02]"
    >
      {/* Time column */}
      <div className="w-16 flex-shrink-0 text-right">
        <div className="text-sm font-bold text-amber-500">{appt.startTime}</div>
        {appt.endTime && (
          <div className="text-[10px] text-[#625f58]">{appt.endTime}</div>
        )}
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-white/10" />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#e8e2d6]">
          {customerName}
        </div>
        <div className="mt-0.5 text-[11px] text-[#8f897e]">
          {serviceName}
          {duration ? ` · ${duration} min` : ""}
        </div>
      </div>

      {/* Status */}
      <StatusBadge status={appt.status} />
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Main dashboard                                                      */
/* ------------------------------------------------------------------ */
const BarberDashboardPage = () => {
  const prefersReducedMotion = useReducedMotion();
  const mongoUser = useAuthStore((s) => s.mongoUser);
  const firstName = (mongoUser?.name || "there").split(" ")[0];

  const [overview, setOverview] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewRes, profileRes] = await Promise.allSettled([
        getMyDashboardOverview(),
        getMyBarberProfile(),
      ]);

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value?.data ?? overviewRes.value);
      } else {
        toast.error("Couldn't load dashboard overview.");
      }

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value?.data ?? profileRes.value);
      }

      // If overview failed entirely, show error state
      if (overviewRes.status === "rejected") {
        setError(
          overviewRes.reason?.response?.data?.message ||
            "Unable to load your dashboard."
        );
      }
    } catch (err) {
      setError("Something went wrong loading the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ---- Greeting based on time of day ---- */
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  /* ---- Derive today's working hours from profile ---- */
  const todayDay = new Date().getDay();
  const todaySchedule = profile?.workingHours?.find(
    (wh) => wh.day === todayDay
  );
  const workingHoursLabel = todaySchedule?.isWorking
    ? `${todaySchedule.startTime} – ${todaySchedule.endTime}`
    : "Day Off";

  /* ---- Today's appointments ---- */
  const todayAppointments = overview?.todayAppointments ?? [];
  const upcomingAppointments = overview?.upcomingAppointments ?? [];
  const todayCount = overview?.todayCount ?? 0;
  const totalCompleted = overview?.totalCompleted ?? 0;

  /* ---- Next appointment (first today) ---- */
  const nextAppt = todayAppointments[0] || null;

  /* ------------------------------------------------------------------ */
  /* Loading state                                                      */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div>
        <div className="mb-8 h-8 w-48 animate-pulse bg-white/5" />
        <div className="h-5 w-72 animate-pulse bg-white/5" />
        <div className="mt-10 grid gap-px border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-[#141311]" />
          ))}
        </div>
        <div className="mt-10 space-y-px border border-white/10 bg-white/5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-[#141311]" />
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Error state                                                        */
  /* ------------------------------------------------------------------ */
  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          Something went wrong
        </div>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8f897e]">
          {error}
        </p>
        <button
          type="button"
          onClick={fetchAll}
          className="mt-6 flex items-center gap-2 border border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
        >
          <RefreshCw size={13} />
          Try Again
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <div>
      {/* ---- Welcome header ---- */}
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
            {greeting},
            <br />
            <span className="text-[#8f897e]">{firstName}.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
            Here&apos;s your day at The Foundry.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAll}
          className="flex items-center gap-2 self-start border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </motion.div>

      {/* ---- Summary stats ---- */}
      <div className="mt-10 grid gap-px border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Today's Appointments"
          value={todayCount}
          delay={0.1}
          prefersReducedMotion={prefersReducedMotion}
        />
        <StatCard
          icon={ChevronRight}
          label="Upcoming (7 days)"
          value={overview?.upcomingCount ?? 0}
          delay={0.15}
          prefersReducedMotion={prefersReducedMotion}
        />
        <StatCard
          icon={CheckCircle2}
          label="Total Completed"
          value={totalCompleted}
          delay={0.2}
          prefersReducedMotion={prefersReducedMotion}
        />
        <StatCard
          icon={Clock}
          label="Today's Hours"
          value={workingHoursLabel}
          delay={0.25}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>

      {/* ---- Next appointment highlight ---- */}
      {nextAppt && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
          className="mt-10 border border-white/10 p-6"
        >
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
            Next Up
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="text-3xl font-extrabold tracking-tight text-amber-500">
              {nextAppt.startTime}
            </div>

            <div className="h-10 w-px bg-white/10 hidden sm:block" />

            <div className="min-w-0 flex-1">
              <div className="text-base font-bold text-[#e8e2d6]">
                {nextAppt.customer?.name || "Client"}
              </div>
              <div className="mt-1 text-xs text-[#8f897e]">
                {nextAppt.service?.name || "Service"}
                {nextAppt.service?.duration
                  ? ` · ${nextAppt.service.duration} min`
                  : ""}
              </div>
            </div>

            <StatusBadge status={nextAppt.status} />
          </div>
        </motion.div>
      )}

      {/* ---- Today's schedule ---- */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          Today&apos;s Schedule
        </div>

        {todayAppointments.length === 0 ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="border border-white/10 px-6 py-16 text-center"
          >
            <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
              Your Chair Is Quiet
            </div>
            <p className="mt-2 text-xs text-[#8f897e]">
              No appointments scheduled for today.
            </p>
          </motion.div>
        ) : (
          <div className="border border-white/10">
            {todayAppointments.map((appt, i) => (
              <AppointmentRow
                key={appt._id || i}
                appt={appt}
                index={i}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Upcoming appointments ---- */}
      {upcomingAppointments.length > 0 && (
        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
            Upcoming — Next 7 Days
          </div>

          <div className="border border-white/10">
            {upcomingAppointments.map((appt, i) => {
              const dateLabel = appt.date
                ? (() => {
                    const d = new Date(appt.date);
                    return `${DAY_NAMES[d.getDay()]}, ${d.toLocaleDateString()}`;
                  })()
                : "";

              return (
                <motion.div
                  key={appt._id || i}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: i * 0.05,
                    ease: EASE,
                  }}
                  className="flex items-center gap-4 border-b border-white/5 px-4 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  {/* Date + time */}
                  <div className="w-28 flex-shrink-0 text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8f897e]">
                      {dateLabel}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-amber-500">
                      {appt.startTime}
                    </div>
                  </div>

                  <div className="h-10 w-px bg-white/10" />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#e8e2d6]">
                      {appt.customer?.name || "Client"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8f897e]">
                      {appt.service?.name || "Service"}
                      {appt.service?.duration
                        ? ` · ${appt.service.duration} min`
                        : ""}
                    </div>
                  </div>

                  <StatusBadge status={appt.status} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberDashboardPage;
