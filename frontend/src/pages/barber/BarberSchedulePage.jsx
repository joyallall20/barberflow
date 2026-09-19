import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Clock, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

import {
  getMyBarberProfile,
  updateMyWorkingHours,
} from "../../services/barberService";

const EASE = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
/* Display order: Monday-first workweek, mapped to backend day values  */
/* (0 = Sunday ... 6 = Saturday, as used by the workingHours schema).  */
const DAY_LABELS = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/* HH:MM options in 30-minute increments */
const TIME_OPTIONS = (() => {
  const out = [];
  for (let m = 5 * 60; m <= 22 * 60; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
})();

const toMinutes = (t) => {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return h * 60 + m;
};

const DEFAULT_DAY = (day) => ({
  day,
  isWorking: false,
  startTime: "09:00",
  endTime: "17:00",
});

/* ------------------------------------------------------------------ */
/* Time select (themed)                                                */
/* ------------------------------------------------------------------ */
const TimeSelect = ({ value, onChange, disabled, ariaLabel }) => (
  <div className="relative">
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="w-full appearance-none border border-white/10 bg-[#141311] px-3 py-2 text-[11px] font-semibold tracking-[0.1em] text-[#e8e2d6] transition-colors hover:border-amber-500 focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
    <Clock
      size={12}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#625f58]"
    />
  </div>
);

/* ------------------------------------------------------------------ */
/* Day toggle                                                          */
/* ------------------------------------------------------------------ */
const DayToggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={`${label} working toggle`}
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-10 flex-shrink-0 border transition-colors ${
      checked ? "border-amber-500 bg-amber-500/20" : "border-white/20 bg-transparent"
    }`}
  >
    <span
      className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${
        checked ? "left-[22px] bg-amber-500" : "left-0.5 bg-[#625f58]"
      }`}
    />
  </button>
);

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
const BarberSchedulePage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [workingHours, setWorkingHours] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const todayDay = new Date().getDay();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getMyBarberProfile();
      const profile = res?.data ?? res;
      const hours = Array.isArray(profile?.workingHours)
        ? profile.workingHours
        : [];

      /* Normalize to all 7 days, backend day-number keyed */
      const map = new Map(hours.map((wh) => [wh.day, wh]));
      const full = DAY_ORDER.map((d) => {
        const existing = map.get(d);
        return existing
          ? {
              day: d,
              isWorking: !!existing.isWorking,
              startTime: existing.startTime || "09:00",
              endTime: existing.endTime || "17:00",
            }
          : DEFAULT_DAY(d);
      });

      setWorkingHours(full);
      setDraft(full.map((wh) => ({ ...wh })));
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load your schedule."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  /* ---- Draft helpers ---- */
  const updateDraftDay = (day, patch) =>
    setDraft((prev) =>
      prev.map((wh) => (wh.day === day ? { ...wh, ...patch } : wh))
    );

  const draftError = useMemo(() => {
    if (!draft) return null;
    for (const wh of draft) {
      if (wh.isWorking) {
        if (!wh.startTime || !wh.endTime) {
          return `${DAY_LABELS[wh.day]}: start and end times are required.`;
        }
        if (toMinutes(wh.startTime) >= toMinutes(wh.endTime)) {
          return `${DAY_LABELS[wh.day]}: end time must be after start time.`;
        }
      }
    }
    return null;
  }, [draft]);

  const handleSave = async () => {
    if (draftError) {
      toast.error(draftError);
      return;
    }

    setSaving(true);
    try {
      /* Backend contract: full replacement array under `workingHours` */
      const payload = draft.map(({ day, isWorking, startTime, endTime }) => ({
        day,
        isWorking,
        ...(isWorking ? { startTime, endTime } : {}),
      }));

      const res = await updateMyWorkingHours(payload);
      const profile = res?.data ?? res;

      const hours = Array.isArray(profile?.workingHours)
        ? profile.workingHours
        : payload;
      const map = new Map(hours.map((wh) => [wh.day, wh]));
      const full = DAY_ORDER.map((d) => {
        const existing = map.get(d);
        return existing
          ? {
              day: d,
              isWorking: !!existing.isWorking,
              startTime: existing.startTime || "09:00",
              endTime: existing.endTime || "17:00",
            }
          : DEFAULT_DAY(d);
      });

      setWorkingHours(full);
      setDraft(full.map((wh) => ({ ...wh })));
      setEditing(false);
      toast.success("Schedule updated.");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Couldn't save your schedule."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(workingHours.map((wh) => ({ ...wh })));
    setEditing(false);
  };

  /* ------------------------------------------------------------------ */
  /* Loading state                                                      */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div>
        <div className="mb-2 h-3 w-24 animate-pulse bg-white/5" />
        <div className="h-8 w-56 animate-pulse bg-white/5" />
        <div className="mt-4 h-5 w-72 animate-pulse bg-white/5" />
        <div className="mt-10 space-y-px border border-white/10 bg-white/5">
          {[...Array(7)].map((_, i) => (
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
          onClick={fetchSchedule}
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
            Schedule
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
            Your working week. Clients can only book inside these hours.
          </p>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 self-start border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
          >
            <Pencil size={13} />
            Edit Schedule
          </button>
        ) : (
          <div className="flex gap-2 self-start">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-white/30 hover:text-[#e8e2d6] disabled:opacity-40"
            >
              <X size={13} />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !!draftError}
              className="flex items-center gap-2 border border-amber-500/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-500 transition-colors hover:border-amber-500 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={13} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </motion.div>

      {/* ---- Validation hint while editing ---- */}
      {editing && draftError && (
        <div className="mt-6 border border-red-500/30 px-4 py-3 text-[11px] text-red-400">
          {draftError}
        </div>
      )}

      {/* ---- Week rows ---- */}
      <div className="mt-8 border border-white/10">
        {DAY_ORDER.map((day, i) => {
          const source = editing ? draft : workingHours;
          const wh = source.find((w) => w.day === day);
          const isToday = day === todayDay;

          return (
            <motion.div
              key={day}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}
              className={`flex flex-col gap-4 border-b border-white/5 px-4 py-5 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-6 ${
                isToday && !editing ? "bg-white/[0.02]" : ""
              }`}
            >
              {/* Day name */}
              <div className="flex w-full items-center justify-between gap-3 sm:w-40 sm:flex-shrink-0 sm:justify-start">
                <div>
                  <div
                    className={`text-xs font-bold uppercase tracking-[0.15em] ${
                      isToday ? "text-amber-500" : "text-[#e8e2d6]"
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </div>
                  {isToday && (
                    <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
                      Today
                    </div>
                  )}
                </div>

                {editing && (
                  <DayToggle
                    checked={wh.isWorking}
                    onChange={(v) => updateDraftDay(day, { isWorking: v })}
                    label={DAY_LABELS[day]}
                  />
                )}
              </div>

              {/* Status + times */}
              {!editing ? (
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {wh.isWorking ? (
                    <>
                      <span className="border border-emerald-500/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-emerald-500">
                        Working
                      </span>
                      <span className="text-sm font-bold tracking-[0.1em] text-amber-500">
                        {wh.startTime}
                        <span className="mx-2 font-normal text-[#625f58]">–</span>
                        {wh.endTime}
                      </span>
                    </>
                  ) : (
                    <span className="border border-[#625f58]/50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-[#625f58]">
                      Day Off
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-3 sm:gap-4">
                  <div className="grid w-full grid-cols-2 gap-3 sm:max-w-xs">
                    <TimeSelect
                      value={wh.startTime}
                      disabled={!wh.isWorking}
                      onChange={(v) => updateDraftDay(day, { startTime: v })}
                      ariaLabel={`${DAY_LABELS[day]} start time`}
                    />
                    <TimeSelect
                      value={wh.endTime}
                      disabled={!wh.isWorking}
                      onChange={(v) => updateDraftDay(day, { endTime: v })}
                      ariaLabel={`${DAY_LABELS[day]} end time`}
                    />
                  </div>

                  {!wh.isWorking && (
                    <span className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58] sm:block">
                      Day Off
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ---- Footnote ---- */}
      <p className="mt-6 max-w-xl text-[11px] leading-relaxed text-[#625f58]">
        {editing
          ? "Turn a day off by switching its toggle. Start and end times are required for working days, and the end must be after the start."
          : "Changes take effect immediately and apply to all future booking availability."}
      </p>
    </div>
  );
};

export default BarberSchedulePage;