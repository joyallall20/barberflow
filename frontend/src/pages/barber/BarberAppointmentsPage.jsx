import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, CalendarDays, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { getMyAppointments } from "../../services/barberService";

const EASE = [0.22, 1, 0.36, 1];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ------------------------------------------------------------------ */
/* Status badge (same styling as Dashboard)                            */
/* ------------------------------------------------------------------ */
const STATUS_STYLES = {
  pending: "border-amber-500/30 text-amber-500",
  confirmed: "border-amber-500/30 text-amber-500",
  completed: "border-emerald-500/30 text-emerald-500",
  cancelled: "border-[#625f58] text-[#625f58]",
  no_show: "border-red-500/30 text-red-400",
};

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled", "no_show"];

const StatusBadge = ({ status }) => (
  <span
    className={`inline-block flex-shrink-0 border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] ${
      STATUS_STYLES[status] || "border-white/10 text-[#8f897e]"
    }`}
  >
    {status?.replace("_", " ") || "—"}
  </span>
);

/* ------------------------------------------------------------------ */
/* Date helpers — local calendar dates formatted as YYYY-MM-DD,        */
/* matching the backend's parseDateOnly (date-only, no time) filter.   */
/* ------------------------------------------------------------------ */
const formatDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/* ------------------------------------------------------------------ */
/* Tabs — date ranges derived from the appointmentQuerySchema contract */
/* ------------------------------------------------------------------ */
const TABS = {
  today: { label: "Today", range: () => {
    const t = new Date();
    return { from: formatDateStr(t), to: formatDateStr(t) };
  } },
  upcoming: { label: "Upcoming", range: () => {
    const t = new Date();
    return { from: formatDateStr(addDays(t, 1)), to: formatDateStr(addDays(t, 30)) };
  } },
};

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/* Appointment row                                                     */
/* ------------------------------------------------------------------ */
const AppointmentRow = ({ appt, index, showDate, prefersReducedMotion }) => {
  const customerName = appt.customer?.name || "Client";
  const serviceName = appt.service?.name || "Service";
  const duration = appt.service?.duration;

  const dateLabel = showDate && appt.date
    ? (() => {
        const d = new Date(appt.date);
        return `${DAY_NAMES[d.getDay()]} ${d.toLocaleDateString()}`;
      })()
    : null;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: EASE }}
      className="flex items-center gap-3 border-b border-white/5 px-4 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:gap-4"
    >
      {/* Time (and date on Upcoming) column */}
      <div className="w-20 flex-shrink-0 text-right sm:w-28">
        {dateLabel && (
          <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8f897e]">
            {dateLabel}
          </div>
        )}
        <div className="text-sm font-bold text-amber-500">{appt.startTime}</div>
        {appt.endTime && (
          <div className="text-[10px] text-[#625f58]">{appt.endTime}</div>
        )}
      </div>

      {/* Divider */}
      <div className="h-10 w-px flex-shrink-0 bg-white/10" />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#e8e2d6]">
          {customerName}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-[#8f897e]">
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
/* Main page                                                           */
/* ------------------------------------------------------------------ */
const BarberAppointmentsPage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [tab, setTab] = useState("today");
  const [status, setStatus] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchAppointments = useCallback(
    async ({ targetPage = 1, append = false } = {}) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const params = { page: targetPage, limit: PAGE_SIZE };
      const range = TABS[tab].range();
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      if (status) params.status = status;

      try {
        const res = await getMyAppointments(params);
        const payload = res?.data ?? res;
        const list = payload?.appointments ?? [];

        setAppointments((prev) => (append ? [...prev, ...list] : list));
        setTotal(payload?.total ?? 0);
        setPage(payload?.page ?? targetPage);
      } catch (err) {
        const message =
          err?.response?.data?.message || "Unable to load your appointments.";
        if (append) toast.error(message);
        else setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tab, status]
  );

  /* Reset to page 1 whenever tab or status filter changes */
  useEffect(() => {
    fetchAppointments({ targetPage: 1, append: false });
  }, [fetchAppointments]);

  const hasMore = appointments.length < total;

  /* ------------------------------------------------------------------ */
  /* Loading state                                                      */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div>
        <div className="mb-2 h-3 w-24 animate-pulse bg-white/5" />
        <div className="h-8 w-64 animate-pulse bg-white/5" />
        <div className="mt-4 h-5 w-80 animate-pulse bg-white/5" />
        <div className="mt-8 flex gap-px border border-white/10 bg-white/5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-10 flex-1 animate-pulse bg-[#141311]" />
          ))}
        </div>
        <div className="mt-6 space-y-px border border-white/10 bg-white/5">
          {[...Array(5)].map((_, i) => (
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
          onClick={() => fetchAppointments({ targetPage: 1 })}
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
      {/* ---- Header ---- */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Business
          </div>
          <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
            Appointments
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
            Everything on your book — today and the weeks ahead.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAppointments({ targetPage: 1 })}
          className="flex items-center gap-2 self-start border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </motion.div>

      {/* ---- Tabs + status filter ---- */}
      <div className="mt-8 flex flex-col gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-px border border-white/10 bg-white/5">
          {Object.entries(TABS).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] transition-colors sm:flex-none ${
                tab === key
                  ? "bg-[#141311] text-amber-500"
                  : "text-[#8f897e] hover:text-[#e8e2d6]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-56">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="w-full appearance-none border border-white/10 bg-[#141311] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-amber-500 focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#625f58]"
          />
        </div>
      </div>

      {/* ---- Count ---- */}
      <div className="mt-6 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
        <CalendarDays size={13} className="text-amber-500" />
        {total} {total === 1 ? "appointment" : "appointments"}
      </div>

      {/* ---- List ---- */}
      {appointments.length === 0 ? (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mt-6 border border-white/10 px-6 py-16 text-center"
        >
          <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
            {tab === "today" ? "Your Chair Is Quiet" : "Nothing On The Books"}
          </div>
          <p className="mt-2 text-xs text-[#8f897e]">
            {tab === "today"
              ? "No appointments scheduled for today."
              : "No upcoming appointments in the next 30 days."}
            {status ? " Try clearing the status filter." : ""}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 border border-white/10"
        >
          {appointments.map((appt, i) => (
            <AppointmentRow
              key={appt._id || i}
              appt={appt}
              index={i}
              showDate={tab === "upcoming"}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </motion.div>
      )}

      {/* ---- Load more ---- */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => fetchAppointments({ targetPage: page + 1, append: true })}
            className="flex items-center gap-2 border border-white/10 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw size={13} className={loadingMore ? "animate-spin" : ""} />
            {loadingMore ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};

export default BarberAppointmentsPage