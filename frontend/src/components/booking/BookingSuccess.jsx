import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  CalendarPlus,
  MapPin,
  ArrowRight,
} from "lucide-react";
import useBookingStore from "../store/bookingStore";

const EASE = [0.22, 1, 0.36, 1];
const SHOP_ADDRESS = "South Congress Ave, Austin, TX";
const MAP_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  SHOP_ADDRESS
)}`;

/* ---------- helpers ---------- */

const to12h = (t) => {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
};

const formatDateLong = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/* Build a minimal .ics file for "Add to Calendar" */
const buildICS = ({ booking }) => {
  if (!booking?.date || !booking?.time) return null;

  const [y, m, d] = booking.date.split("-").map(Number);
  const [hh, mm] = booking.time.split(":").map(Number);

  const start = new Date(y, m - 1, d, hh, mm);
  const durationMin = booking?.service?.duration || 45;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  const fmt = (dt) =>
    dt
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

  const summary = `${booking?.service?.name || "Appointment"} — The Foundry`;
  const description = `Barber: ${
    booking?.barber?.name || "Anyone Available"
  }\\nRef: ${booking?.reference || booking?._id || "—"}`;
  const location = "The Foundry, South Congress Ave, Austin, TX";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Foundry//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${booking?._id || Date.now()}@thefoundry.demo`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

const downloadICS = (ics, filename = "the-foundry-appointment.ics") => {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ---------- component ---------- */

const BookingSuccess = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const booking = useBookingStore((s) => s.booking);
  const resetBooking = useBookingStore((s) => s.resetBooking);

  // If a user lands here without a booking, send them into the flow
  useEffect(() => {
    if (!booking) {
      const t = setTimeout(() => {
        // Soft redirect — no hard refresh
        navigate("/book", { replace: true });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [booking, navigate]);

  const reference = useMemo(
    () =>
      booking?.reference ||
      (booking?._id ? String(booking._id).slice(-8).toUpperCase() : null),
    [booking]
  );

  const handleAddToCalendar = () => {
    const ics = buildICS({ booking });
    if (ics) downloadICS(ics);
  };

  const handleBackHome = () => {
    resetBooking();
    navigate("/");
  };

  /* ---------- Empty state ---------- */
  if (!booking) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#141311] px-6 text-[#e8e2d6]">
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            The Foundry
          </div>
          <p className="mt-3 text-sm text-[#8f897e]">
            No booking found. Taking you back…
          </p>
        </div>
      </main>
    );
  }

  /* ---------- Success state ---------- */
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#141311] text-[#e8e2d6]">
      {/* Subtle background wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="whitespace-nowrap text-[22vw] font-black uppercase leading-none text-white/[0.02]">
          Confirmed
        </span>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12 md:px-12 md:py-16 lg:px-16">
        {/* Top bar */}
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackHome}
            className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e] transition-colors hover:text-amber-500"
          >
            ← The Foundry
          </button>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Booking Confirmed
          </div>
        </div>

        {/* Hero line */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            <span className="h-px w-8 bg-amber-500" />
            See you soon
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">
            Booking confirmed.
            <br />
            <span className="text-[#8f897e]">The chair is waiting.</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#aaa398] md:text-base">
            A confirmation with all the details is on its way. If anything
            changes, reply to that email or call the shop — we&apos;ll sort it.
          </p>
        </motion.div>

        {/* ---------- Ticket ---------- */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="mt-10 border border-white/10 md:mt-14"
        >
          {/* Ticket header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center border border-amber-500 bg-amber-500 text-black">
                <Check size={14} strokeWidth={3} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
                Reference
              </span>
              <span className="text-sm font-bold uppercase tracking-wider text-amber-500">
                {reference || "—"}
              </span>
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
              The Foundry · Austin
            </span>
          </div>

          {/* Ticket body */}
          <dl className="divide-y divide-white/10">
            <TicketRow
              label="Date"
              value={formatDateLong(booking.date)}
            />
            <TicketRow label="Time" value={to12h(booking.time)} />
            <TicketRow
              label="Service"
              value={booking?.service?.name || "—"}
              hint={
                booking?.service?.price != null
                  ? `$${booking.service.price}`
                  : undefined
              }
            />
            <TicketRow
              label="Barber"
              value={
                booking?.barber?.isAnyone
                  ? "Anyone Available"
                  : booking?.barber?.name || "Assigned at arrival"
              }
            />
            <TicketRow
              label="Name"
              value={booking?.customer?.name || "—"}
            />
            <TicketRow
              label="Contact"
              value={booking?.customer?.email || "—"}
              hint={booking?.customer?.phone}
            />
            {booking?.notes ? (
              <TicketRow label="Notes" value={booking.notes} />
            ) : null}
          </dl>
        </motion.div>

        {/* ---------- Actions ---------- */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        >
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="inline-flex items-center justify-center gap-3 bg-amber-500 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-amber-400"
          >
            <CalendarPlus size={14} />
            Add to Calendar
          </button>

          <a
            href={MAP_DIRECTIONS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 border border-white/15 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
          >
            <MapPin size={14} />
            Get Directions
          </a>

          <button
            type="button"
            onClick={handleBackHome}
            className="inline-flex items-center justify-center gap-3 border border-white/15 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
          >
            Back to Home
            <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Footer note */}
        <p className="mt-10 text-[10px] uppercase tracking-[0.25em] text-[#625f58]">
          Demo booking · The Foundry is a fictional barbershop
        </p>
      </div>
    </main>
  );
};

/* ---------- small pieces ---------- */

const TicketRow = ({ label, value, hint }) => (
  <div className="flex items-baseline justify-between gap-6 px-5 py-3.5 md:px-6">
    <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
      {label}
    </dt>
    <dd className="flex items-baseline gap-3 text-right">
      <span className="max-w-[60vw] truncate text-sm font-semibold text-[#e8e2d6]">
        {value || "—"}
      </span>
      {hint ? (
        <span className="text-xs font-medium text-amber-500">{hint}</span>
      ) : null}
    </dd>
  </div>
);

export default BookingSuccess;