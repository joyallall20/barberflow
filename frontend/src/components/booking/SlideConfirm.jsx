import { useState, useMemo, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Check, AlertCircle, Loader2 } from "lucide-react";
import useBookingStore from "../../store/bookingStore";
import useAuthStore from "../../store/authStore";
import { createBooking } from "../../services/bookingService";
import { createPayment } from "../../services/paymentService";
import PayPalCheckout from "../payment/PayPalCheckout";

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

  if (!name || name.trim().length < 2) {
    errors.name = "Please enter your name.";
  }

  const phoneDigits = (phone || "").replace(/\D/g, "");

  if (phoneDigits.length < 7) {
    errors.phone = "Please enter a valid phone.";
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");

  if (!emailOk) {
    errors.email = "Please enter a valid email.";
  }

  return errors;
};

/* ---------- component ---------- */

const SlideConfirm = ({ navigate }) => {
  const prefersReducedMotion = useReducedMotion();

  const date = useBookingStore((s) => s.date);
  const time = useBookingStore((s) => s.time);
  const service = useBookingStore((s) => s.service);
  const barber = useBookingStore((s) => s.barber);
  const customer = useBookingStore((s) => s.customer);
  const notes = useBookingStore((s) => s.notes);

  const setCustomer = useBookingStore((s) => s.setCustomer);
  const setBooking = useBookingStore((s) => s.setBooking);
  const setNotes = useBookingStore((s) => s.setNotes);
  const previousStep = useBookingStore((s) => s.previousStep);

  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    email: false,
  });

  const [phase, setPhase] = useState("idle");
  const [serverError, setServerError] = useState(null);
  const [paypalData, setPaypalData] = useState(null);
  const [createdAppointmentId, setCreatedAppointmentId] = useState(null);

  // "online" | "pay_at_shop"
  const [paymentMethod, setPaymentMethod] = useState("online");

  const errors = useMemo(() => validate(customer), [customer]);

  const hasErrors = Object.keys(errors).length > 0;

  const authUser = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  // Prefill known customer details from the authenticated user so we don't
  // ask for information that's already on file. Only fills fields that are
  // still empty — never overwrites something the customer already typed.
  // NOTE: field names here (displayName/name, email, phone/phoneNumber) are
  // a best guess since authStore.js wasn't available to inspect — verify
  // against your actual auth user shape.
  useEffect(() => {
    if (!authUser) return;

    const prefill = {};
    if (!customer.name && (authUser.name || authUser.displayName)) {
      prefill.name = authUser.name || authUser.displayName;
    }
    if (!customer.email && authUser.email) {
      prefill.email = authUser.email;
    }
    if (!customer.phone && (authUser.phone || authUser.phoneNumber)) {
      prefill.phone = authUser.phone || authUser.phoneNumber;
    }

    if (Object.keys(prefill).length > 0) {
      setCustomer(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  const setField = (field) => (e) => {
    setCustomer({
      [field]: e.target.value,
    });
  };

  const markTouched = (field) => () =>
    setTouched((t) => ({
      ...t,
      [field]: true,
    }));

  const isBusy = phase === "booking" || (phase === "idle" && authLoading);

  const handleConfirm = async () => {
    if (phase !== "idle" && phase !== "payment_init_failed") return;

    if (authLoading) return; // Wait for Firebase initialization

    if (!authUser) {
      navigate("/login", {
        state: {
          from: "/book",
          returnToBooking: true,
        },
      });
      return;
    }

    setServerError(null);

    setTouched({
      name: true,
      phone: true,
      email: true,
    });

    if (hasErrors) return;

    /*
     * If an appointment was already created, NEVER create another one.
     * We only retry payment initialization.
     */
    let appointmentId = createdAppointmentId;

    // ---------------------------------------------------------------
    // STEP 1 — Create appointment ONLY if we don't already have one
    // ---------------------------------------------------------------
    if (!appointmentId) {
      setPhase("booking");

      const appointmentPayload = {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        barber: pickId(barber),
        service: pickId(service),
        date,
        startTime: time,
        paymentMethod,
        notes: notes?.trim() || "",
      };

      try {
        const res = await createBooking(appointmentPayload);

        const booking =
          res?.data?.appointment ??
          res?.data ??
          res;

        appointmentId = booking?._id ?? booking?.id;

        if (!appointmentId) {
          throw new Error(
            "Booking was created but the appointment id was missing."
          );
        }

        setCreatedAppointmentId(appointmentId);
        setBooking(booking);
      } catch (err) {
        setServerError(
          err?.response?.data?.message ||
            err?.message ||
            "Could not confirm your booking. Please try again."
        );

        setPhase("idle");
        return;
      }

      /* ---------------------------------------------------------------
       * Pay at shop — no Payment record, no PayPal.
       * Appointment stays unpaid. Navigate directly to success.
       * ------------------------------------------------------------- */
      if (paymentMethod === "pay_at_shop") {
        setPhase("done");
        navigate("/booking/success");
        return;
      }
    }

    // ---------------------------------------------------------------
    // STEP 2 — Create payment for the EXISTING appointment
    // ---------------------------------------------------------------
    setPhase("booking");

    try {
      const res = await createPayment(appointmentId);

      const paymentPayload = res?.data ?? res;

      const payment = paymentPayload?.payment;
      const orderId =
        paymentPayload?.paypalOrderId ??
        paymentPayload?.orderId;

      if (!payment || !orderId) {
        throw new Error(
          "Payment could not be initialized by the server."
        );
      }

      setPaypalData({
        payment,
        paypalOrderId: orderId,
      });

      setPhase("paying");
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start payment. Please try again."
      );

      /*
       * IMPORTANT:
       * The appointment already exists.
       * Do NOT return to normal booking state.
       *
       * This allows the user to retry payment without
       * creating a second appointment.
       */
      setPhase("payment_init_failed");
    }
  };

  /* ---------------------------------------------------------------
   * PayPalCheckout calls this ONLY after the backend capture
   * response confirms payment.status === "completed".
   * ------------------------------------------------------------- */
  const handlePaymentSuccess = () => {
    setPhase("done");
    navigate("/booking/success");
  };

  const handlePaymentError = (message) => {
    setServerError(message || "Payment could not be completed.");
    setPhase("paying"); // keep PayPal UI visible for retry
  };

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* ---------- Header ---------- */}

      <div>
        <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          <span className="h-px w-8 bg-amber-500" />
          Step 04 — Confirm
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
          <ReceiptRow
            label="Barber"
            value={barber?.isAnyone ? "Anyone Available" : barber?.name || "—"}
          />

          <ReceiptRow
            label="Service"
            value={service?.name || service?.title || "—"}
          />

          {service?.duration != null && (
            <ReceiptRow label="Duration" value={`${service.duration} min`} />
          )}

          <ReceiptRow label="Date" value={formatDateLine(date)} />

          <ReceiptRow label="Time" value={to12h(time)} />

          {service?.price != null && (
            <ReceiptRow label="Price" value={`$${service.price}`} emphasis />
          )}
        </dl>
      </div>

      {/* ---------- Form ---------- */}

      <fieldset
        disabled={phase !== "idle" && phase !== "payment_init_failed"}
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
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
      </fieldset>

      {/* ---------- Payment method ---------- */}
      {phase === "idle" && (
        <section className="border border-white/10">
          <div className="border-b border-white/10 px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
              Payment method
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2">
            {/* Pay now */}
            <button
              type="button"
              onClick={() => setPaymentMethod("online")}
              className={`text-left border p-5 transition-all ${
                paymentMethod === "online"
                  ? "border-amber-500 bg-amber-500/[0.06]"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    paymentMethod === "online"
                      ? "border-amber-500"
                      : "border-white/30"
                  }`}
                >
                  {paymentMethod === "online" && (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </span>

                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-[#e8e2d6]">
                    Pay now
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-[#8f897e]">
                    Pay securely online with PayPal and confirm your appointment
                    immediately.
                  </p>
                </div>
              </div>
            </button>

            {/* Pay at shop */}
            <button
              type="button"
              onClick={() => setPaymentMethod("pay_at_shop")}
              className={`text-left border p-5 transition-all ${
                paymentMethod === "pay_at_shop"
                  ? "border-amber-500 bg-amber-500/[0.06]"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    paymentMethod === "pay_at_shop"
                      ? "border-amber-500"
                      : "border-white/30"
                  }`}
                >
                  {paymentMethod === "pay_at_shop" && (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </span>

                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-[#e8e2d6]">
                    Pay at shop
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-[#8f897e]">
                    Reserve your appointment now and pay when you arrive at the
                    shop.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ---------- PayPal section (only when pay now is in flight/done) ---------- */}
      {phase !== "idle" && phase !== "booking" && phase !== "payment_init_failed" && paypalData && (
        <div className="border border-white/10">
          <div className="border-b border-white/10 px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
              Payment
            </div>
          </div>

          <div className="p-5">
            <p className="mb-4 text-xs leading-relaxed text-[#aaa398]">
              Complete payment with PayPal to secure your appointment. Your card
              details never touch our servers.
            </p>

            <PayPalCheckout
              payment={paypalData.payment}
              paypalOrderId={paypalData.paypalOrderId}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        </div>
      )}

      {/* ---------- Server error ---------- */}

      {serverError && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: EASE,
          }}
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
          disabled={phase !== "idle" && phase !== "payment_init_failed"}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500 disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          Back to Time
        </button>

        {phase === "idle" ||
        phase === "booking" ||
        phase === "payment_init_failed" ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isBusy}
            className={`inline-flex items-center gap-3 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
              isBusy
                ? "cursor-wait bg-amber-500/70 text-black"
                : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {isBusy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {authLoading ? "Checking Auth…" : "Processing…"}
              </>
            ) : phase === "payment_init_failed" ? (
              <>
                <Check size={14} />
                Retry Payment
              </>
            ) : (
              <>
                <Check size={14} />

                {paymentMethod === "online"
                  ? "Confirm & Pay"
                  : "Confirm Booking"}
              </>
            )}
          </button>
        ) : phase === "paying" ? (
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
            Awaiting payment
          </div>
        ) : (
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
            Booking confirmed
          </div>
        )}
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

export default SlideConfirm;