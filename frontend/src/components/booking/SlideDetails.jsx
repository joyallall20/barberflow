import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import useBookingStore from "../../store/bookingStore";
import { createBooking } from "../../services/bookingService";

const EASE = [0.22, 1, 0.36, 1];

const pickId = (obj) => obj?._id || obj?.id || obj?.slug;

const to12h = (t) => {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
};

const formatDateLine = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

/* ---------- validators ---------- */

const validate = ({ name, phone, email }) => {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = "Please enter your name.";

  const phoneDigits = (phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 7) errors.phone = "Please enter a valid phone.";

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
  if (!emailOk) errors.email = "Please enter a valid email.";

  return errors;
};

/* ---------- component ---------- */

const SlideDetails = ({ navigate }) => {
  const prefersReducedMotion = useReducedMotion();

  const date = useBookingStore((s) => s.date);
  const time = useBookingStore((s) => s.time);
  const service = useBookingStore((s) => s.service);
  const barber = useBookingStore((s) => s.barber);
  const customer = useBookingStore((s) => s.customer);
  const notes = useBookingStore((s) => s.notes);

  const setCustomer = useBookingStore((s) => s.setCustomer);
  const setNotes = useBookingStore((s) => s.setNotes);
  const setBooking = useBookingStore((s) => s.setBooking);
  const previousStep = useBookingStore((s) => s.previousStep);

  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    email: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const errors = useMemo(() => validate(customer), [customer]);
  const hasErrors = Object.keys(errors).length > 0;

  const setField = (field) => (e) => {
    setCustomer({ [field]: e.target.value });
  };

  const markTouched = (field) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleConfirm = async () => {
    if (submitting) return;
    setServerError(null);

    setTouched({ name: true, phone: true, email: true });
    if (hasErrors) return;

    setSubmitting(true);

   const payload = {
  name: customer.name.trim(),
  email: customer.email.trim(),
  phone: customer.phone.trim(),

  barber: pickId(barber),
  service: pickId(service),

  date,
  startTime: time,

  notes: notes?.trim() || "",
};

    try {
      const res = await createBooking(payload);
      const booking = res?.data ?? res;

      setBooking(booking);
      navigate("/booking/success");
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not confirm your booking. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* ---------- Header ---------- */}
      <div>
        <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          <span className="h-px w-8 bg-amber-500" />
          Step 04 — Details
        </div>

        <h1 className="max-w-2xl text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl lg:text-5xl">
          Last step.
          <br />
          <span className="text-[#8f897e]">Then the chair is yours.</span>
        </h1>
      </div>

      {/* ---------- Summary receipt ---------- */}
      <div className="border border-white/10">
        <div className="border-b border-white/10 px-5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
            Your appointment
          </div>
        </div>

        <dl className="divide-y divide-white/10">
          <ReceiptRow label="Date" value={formatDateLine(date)} />
          <ReceiptRow label="Time" value={to12h(time)} />
          <ReceiptRow
            label="Service"
            value={service?.name || service?.title || "—"}
          />
          <ReceiptRow
            label="Barber"
            value={barber?.isAnyone ? "Anyone Available" : barber?.name || "—"}
          />
          {service?.price != null && (
            <ReceiptRow
              label="Price"
              value={`$${service.price}`}
              emphasis
            />
          )}
        </dl>
      </div>

      {/* ---------- Form ---------- */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          label="Name"
          name="name"
          value={customer.name}
          onChange={setField("name")}
          onBlur={markTouched("name")}
          placeholder="Marcus Johnson"
          error={touched.name ? errors.name : null}
          autoComplete="name"
        />

        <Field
          label="Phone"
          name="phone"
          value={customer.phone}
          onChange={setField("phone")}
          onBlur={markTouched("phone")}
          placeholder="+1 512 555 0199"
          error={touched.phone ? errors.phone : null}
          type="tel"
          autoComplete="tel"
        />

        <div className="md:col-span-2">
          <Field
            label="Email"
            name="email"
            value={customer.email}
            onChange={setField("email")}
            onBlur={markTouched("email")}
            placeholder="you@example.com"
            error={touched.email ? errors.email : null}
            type="email"
            autoComplete="email"
          />
        </div>

        <div className="md:col-span-2">
          <Field
            label="Notes (optional)"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know before you sit down?"
            as="textarea"
          />
        </div>
      </div>

      {/* ---------- Server error ---------- */}
      {serverError && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="flex items-start gap-3 border border-red-500/30 bg-red-500/[0.04] p-4"
        >
          <AlertCircle size={16} className="mt-0.5 text-red-400" />
          <p className="text-xs leading-relaxed text-[#e8e2d6]">
            {serverError}
          </p>
        </motion.div>
      )}

      {/* ---------- Footer nav ---------- */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() => previousStep()}
          disabled={submitting}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500 disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Back
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className={`inline-flex items-center gap-3 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
            submitting
              ? "cursor-wait bg-amber-500/70 text-black"
              : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Confirming…
            </>
          ) : (
            <>
              <Check size={14} />
              Confirm Appointment
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/* ---------- small pieces ---------- */

const ReceiptRow = ({ label, value, emphasis }) => (
  <div className="flex items-baseline justify-between px-5 py-3">
    <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
      {label}
    </dt>
    <dd
      className={`text-right text-sm ${
        emphasis
          ? "text-base font-bold text-amber-500"
          : "font-semibold text-[#e8e2d6]"
      }`}
    >
      {value || "—"}
    </dd>
  </div>
);

const Field = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  type = "text",
  autoComplete,
  as,
}) => {
  const baseInput =
    "w-full border-b border-white/15 bg-transparent px-0 py-3 text-sm text-[#e8e2d6] placeholder:text-[#3a3733] focus:border-amber-500 focus:outline-none transition-colors";

  const errorBorder = error ? "border-red-500/60" : "";

  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
        {label}
      </span>

      {as === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={3}
          className={`${baseInput} ${errorBorder} resize-none`}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${baseInput} ${errorBorder}`}
        />
      )}

      {error && (
        <span className="mt-1.5 block text-[11px] text-red-400">{error}</span>
      )}
    </label>
  );
};

export default SlideDetails;