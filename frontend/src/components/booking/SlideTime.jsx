import { useEffect, useRef, useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from "lucide-react";
import useBookingStore from "../../store/bookingStore";
import { getBookingAvailability } from "../../services/bookingService";

const EASE = [0.22, 1, 0.36, 1];

const pickId = (obj) => obj?._id || obj?.id || obj?.slug;

/* ---------- helpers ---------- */

const to12h = (t) => {
  if (!t) return "";

  // Accepts "14:30" or "14:30:00"
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;

  return `${h12}:${mStr} ${suffix}`;
};

const groupByPeriod = (slots) => {
  const groups = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };

  for (const s of slots) {
    const hour = Number(String(s).split(":")[0]);

    if (hour < 12) {
      groups.Morning.push(s);
    } else if (hour < 17) {
      groups.Afternoon.push(s);
    } else {
      groups.Evening.push(s);
    }
  }

  return groups;
};

const formatDateLine = (iso) => {
  if (!iso) return "";

  const d = new Date(`${iso}T00:00:00`);

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/* ---------- component ---------- */

const SlideTime = ({ navigate }) => {
  const prefersReducedMotion = useReducedMotion();

  const date = useBookingStore((s) => s.date);
  const service = useBookingStore((s) => s.service);
  const barber = useBookingStore((s) => s.barber);
  const time = useBookingStore((s) => s.time);
  const setTime = useBookingStore((s) => s.setTime);
  const nextStep = useBookingStore((s) => s.nextStep);
  const previousStep = useBookingStore((s) => s.previousStep);

  const serviceId = pickId(service);
  const barberId = barber?.isAnyone ? undefined : pickId(barber);

  const [state, setState] = useState({
    loading: true,
    error: null,
    slots: [],
  });

  const reqRef = useRef(0);

  // Fetch availability whenever date / service / barber changes
  useEffect(() => {
    if (!date || !serviceId || !barberId) return;

    const reqId = ++reqRef.current;

    setState({
      loading: true,
      error: null,
      slots: [],
    });

    getBookingAvailability({
      date,
      service: serviceId,
      barber: barberId,
    })
      .then((res) => {
        if (reqId !== reqRef.current) return;

        const payload = Array.isArray(res)
          ? res
          : Array.isArray(res?.slots)
          ? res.slots
          : Array.isArray(res?.data?.slots)
          ? res.data.slots
          : [];

        setState({
          loading: false,
          error: null,
          slots: payload,
        });
      })
      .catch((err) => {
        if (reqId !== reqRef.current) return;

        setState({
          loading: false,
          slots: [],
          error:
            err?.response?.data?.message ||
            err?.message ||
            "Could not load availability.",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId, barberId]);

  // Clear the stored time if the current one isn't in the fresh slot list
  useEffect(() => {
    if (state.loading || state.error) return;

    if (time && !state.slots.includes(time)) {
      setTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.slots, state.loading, state.error]);

  const groups = useMemo(
    () => groupByPeriod(state.slots),
    [state.slots]
  );

  const totalSlots = state.slots.length;

  const handleContinue = () => {
    if (!time) return;
    nextStep();
  };

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      {/* ---------- Header ---------- */}
      <div>
        <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          <span className="h-px w-8 bg-amber-500" />
          Step 03 — Time
        </div>

        <h1 className="max-w-2xl text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl lg:text-5xl">
          Pick your slot.
          <br />
          <span className="text-[#8f897e]">
            It takes 30 seconds.
          </span>
        </h1>
      </div>

      {/* ---------- Summary strip ---------- */}
      <div className="grid grid-cols-1 gap-px border border-white/10 bg-white/5 sm:grid-cols-3">
        <SummaryCell
          label="Date"
          value={formatDateLine(date)}
        />

        <SummaryCell
          label="Service"
          value={service?.name || service?.title || "—"}
        />

        <SummaryCell
          label="Barber"
          value={
            barber?.isAnyone
              ? "Anyone Available"
              : barber?.name || "—"
          }
        />
      </div>

      {/* ---------- Slot area ---------- */}
      <div>
        {/* Loading */}
        {state.loading && (
          <div>
            <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
              Checking the diary…
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!state.loading && state.error && (
          <div className="flex flex-col items-start gap-4 border border-red-500/30 bg-red-500/[0.04] p-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={18} />

              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Availability unavailable
              </span>
            </div>

            <p className="max-w-md text-sm text-[#aaa398]">
              {state.error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="border border-white/20 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition hover:border-amber-500 hover:text-amber-500"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty */}
        {!state.loading &&
          !state.error &&
          totalSlots === 0 && (
            <div className="flex flex-col items-start gap-4 border border-white/10 p-6">
              <div className="flex items-center gap-3 text-[#8f897e]">
                <Clock size={18} />

                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Fully booked
                </span>
              </div>

              <p className="max-w-md text-sm text-[#aaa398]">
                No times left for this combination. Try another
                day, or pick a different barber.
              </p>

              <button
                type="button"
                onClick={() => previousStep()}
                className="border border-white/20 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition hover:border-amber-500 hover:text-amber-500"
              >
                Change Date
              </button>
            </div>
          )}

        {/* Success — grouped slot grid */}
        {!state.loading &&
          !state.error &&
          totalSlots > 0 && (
            <div className="flex flex-col gap-7">
              {Object.entries(groups).map(
                ([period, slots]) =>
                  slots.length === 0 ? null : (
                    <div key={period}>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
                          {period}
                        </span>

                        <span className="h-px flex-1 bg-white/10" />

                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#625f58]">
                          {slots.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {slots.map((slot, i) => {
                          const isSelected = slot === time;

                          return (
                            <motion.button
                              key={slot}
                              type="button"
                              initial={
                                prefersReducedMotion
                                  ? false
                                  : { opacity: 0, y: 6 }
                              }
                              animate={{
                                opacity: 1,
                                y: 0,
                              }}
                              transition={{
                                duration: 0.3,
                                delay: prefersReducedMotion
                                  ? 0
                                  : i * 0.02,
                                ease: EASE,
                              }}
                              onClick={() => setTime(slot)}
                              aria-pressed={isSelected}
                              className={`border py-3 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                isSelected
                                  ? "border-amber-500 bg-amber-500 text-black"
                                  : "border-white/15 text-[#e8e2d6] hover:border-amber-500 hover:text-amber-500"
                              }`}
                            >
                              {to12h(slot)}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )
              )}
            </div>
          )}
      </div>

      {/* ---------- Footer nav ---------- */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() => previousStep()}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500"
        >
          <ChevronLeft size={14} />
          Back
        </button>

        <button
          type="button"
          disabled={!time}
          onClick={handleContinue}
          className={`inline-flex items-center gap-3 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
            time
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

/* ---------- small pieces ---------- */

const SummaryCell = ({ label, value }) => (
  <div className="bg-[#141311] p-4">
    <div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
      {label}
    </div>

    <div className="mt-1 truncate text-xs font-semibold uppercase tracking-wider text-[#e8e2d6]">
      {value || "—"}
    </div>
  </div>
);

export default SlideTime;