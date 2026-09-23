import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useBookingStore from "../../store/bookingStore";

const EASE = [0.22, 1, 0.36, 1];
const DAYS_AHEAD = 14;

/* ---------- helpers ---------- */

const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ---------- component ---------- */

const SlideDate = ({ navigate }) => {
  const prefersReducedMotion = useReducedMotion();
  const date = useBookingStore((s) => s.date);
  const setDate = useBookingStore((s) => s.setDate);
  const nextStep = useBookingStore((s) => s.nextStep);
  const previousStep = useBookingStore((s) => s.previousStep);

  // Build the next 14 days starting today
  const days = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: DAYS_AHEAD }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const isSunday = d.getDay() === 0;
      const iso = toISO(d);

      return {
        iso,
        dateObj: d,
        dayNum: d.getDate(),
        weekdayShort: WEEKDAY_SHORT[d.getDay()],
        weekdayLong: WEEKDAY_LONG[d.getDay()],
        monthShort: MONTH_LONG[d.getMonth()].slice(0, 3),
        isToday: i === 0,
        isDisabled: isSunday, // shop closed Sundays
      };
    });
  }, []);

  const selected = days.find((d) => d.iso === date) || null;

  const handleContinue = () => {
    if (!date) return;
    nextStep();
  };

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      {/* ---------- Header ---------- */}
      <div>
        <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          <span className="h-px w-8 bg-amber-500" />
          Step 02 — Date
        </div>

        <h1 className="max-w-2xl text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl lg:text-5xl">
          Pick a day.
          <br />
          <span className="text-[#8f897e]">We&apos;ll do the rest.</span>
        </h1>
      </div>

      {/* ---------- Main date display + strip ---------- */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-12">
        {/* Big numeral block */}
        <motion.div
          key={selected?.iso || "empty"}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="border border-white/10 p-8 md:col-span-4 md:p-10"
        >
          {selected ? (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                {selected.isToday ? "Today" : selected.weekdayLong}
              </div>

              <div className="mt-2 text-6xl font-black leading-none tracking-tight md:text-7xl lg:text-8xl">
                {selected.dayNum}
              </div>

              <div className="mt-3 text-sm uppercase tracking-[0.2em] text-[#8f897e]">
                {selected.monthShort} {selected.dateObj.getFullYear()}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-[#aaa398]">
                Next, choose your service and barber. You can change this
                date anytime.
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
                No date yet
              </div>
              <div className="mt-2 text-6xl font-black leading-none tracking-tight text-[#3a3733] md:text-7xl lg:text-8xl">
                —
              </div>
              <div className="mt-3 text-sm uppercase tracking-[0.2em] text-[#625f58]">
                Select a day →
              </div>
            </>
          )}
        </motion.div>

        {/* Date strip */}
        <div className="md:col-span-8">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
            Next {DAYS_AHEAD} Days
          </div>

          {/* Scrollable strip on mobile, wraps/grid on md+ */}
          <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:overflow-visible md:px-0">
            <div className="flex w-max gap-2 md:grid md:w-full md:grid-cols-7 md:gap-2">
              {days.map((d) => {
                const isSelected = d.iso === date;
                const disabled = d.isDisabled;

                return (
                  <button
                    key={d.iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setDate(d.iso)}
                    aria-label={`${d.weekdayLong}, ${MONTH_LONG[d.dateObj.getMonth()]} ${d.dayNum}`}
                    aria-pressed={isSelected}
                    className={`group relative flex w-[64px] flex-shrink-0 flex-col items-center justify-center border py-3 transition-all duration-200 md:w-auto ${
                      disabled
                        ? "cursor-not-allowed border-white/5 text-[#3a3733]"
                        : isSelected
                        ? "border-amber-500 bg-amber-500 text-black"
                        : "border-white/15 text-[#e8e2d6] hover:border-amber-500 hover:text-amber-500"
                    }`}
                  >
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-[0.15em] ${
                        isSelected
                          ? "text-black/70"
                          : disabled
                          ? "text-[#3a3733]"
                          : "text-[#8f897e]"
                      }`}
                    >
                      {d.weekdayShort}
                    </span>

                    <span className="mt-1 text-lg font-bold leading-none">
                      {d.dayNum}
                    </span>

                    <span
                      className={`mt-1 text-[9px] uppercase tracking-[0.15em] ${
                        isSelected
                          ? "text-black/70"
                          : disabled
                          ? "text-[#3a3733]"
                          : "text-[#625f58]"
                      }`}
                    >
                      {d.monthShort}
                    </span>

                    {d.isToday && !isSelected && !disabled && (
                      <span className="absolute bottom-1 h-px w-4 bg-amber-500" />
                    )}

                    {disabled && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-px w-6 rotate-[-20deg] bg-[#3a3733]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[#625f58]">
            Closed Sundays. All times displayed in Central Time.
          </p>
        </div>
      </div>

      {/* ---------- Footer nav ---------- */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() => previousStep()}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500"
        >
          <ChevronLeft size={14} /> Back to Barber & Service
        </button>

        <button
          type="button"
          disabled={!date}
          onClick={handleContinue}
          className={`inline-flex items-center gap-3 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
            date
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : "cursor-not-allowed border border-white/10 text-[#3a3733]"
          }`}
        >
          Continue
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default SlideDate;