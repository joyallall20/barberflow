import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import useBookingStore from "../store/bookingStore";
import {
  getBookingServices,
  getBookingBarbers,
} from "../services/bookingService";
import BookingProgress from "../components/booking/BookingProgress";
import SlideDate from "../components/booking/SlideDate";
import SlideServiceBarber from "../components/booking/SlideServiceBarber";
import SlideTime from "../components/booking/SlideTime";
import SlideDetails from "../components/booking/SlideDetails";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Normalize whatever the API returns into a plain array.
 * Handles: [ ... ], { data: [ ... ] }, { services: [ ... ] }, { barbers: [ ... ] }
 */
const toArray = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const Book = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const step = useBookingStore((s) => s.step);
  const setStep = useBookingStore((s) => s.setStep);
  const hydrateFromQuery = useBookingStore((s) => s.hydrateFromQuery);
  const resetBooking = useBookingStore((s) => s.resetBooking);

  const [catalog, setCatalog] = useState({
    services: [],
    barbers: [],
    loading: true,
    error: null,
  });

  // Reset the flow when the user lands on /book fresh
  useEffect(() => {
    resetBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Fetch catalog (services + barbers) ----
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setCatalog((c) => ({ ...c, loading: true, error: null }));

        const [servicesRes, barbersRes] = await Promise.all([
          getBookingServices(),
          getBookingBarbers(),
        ]);

        if (cancelled) return;

        setCatalog({
          services: toArray(servicesRes, "services"),
          barbers: toArray(barbersRes, "barbers"),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setCatalog((c) => ({
          ...c,
          loading: false,
          error:
            err?.response?.data?.message ||
            err?.message ||
            "Unable to load booking options.",
        }));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Hydrate selections from URL once catalog is ready ----
  useEffect(() => {
    if (catalog.loading || catalog.error) return;

    const slugService = searchParams.get("service");
    const slugBarber = searchParams.get("barber");
    if (!slugService && !slugBarber) return;

    const resolve = (list, slug, slugKeys = ["slug", "_id", "id"]) => {
      if (!slug) return null;
      return (
        list.find((item) =>
          slugKeys.some((k) => String(item?.[k]) === String(slug))
        ) || null
      );
    };

    hydrateFromQuery({
      service: resolve(catalog.services, slugService),
      barber: resolve(catalog.barbers, slugBarber),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.loading, catalog.error, catalog.services, catalog.barbers]);

  // ---- Guard: keep step consistent with selection state ----
  useEffect(() => {
    const { date, service, barber, time } = useBookingStore.getState();

    if (step === 2 && !date) setStep(1);
    if (step === 3 && (!date || !service || !barber)) setStep(2);
    if (step === 4 && (!date || !service || !barber || !time)) setStep(3);
  }, [step, setStep]);

  const slideProps = { catalog, navigate };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#141311] text-[#e8e2d6]">
      {/* Subtle background wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="whitespace-nowrap text-[22vw] font-black uppercase leading-none text-white/[0.02]">
          Book
        </span>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 md:px-12 md:py-14 lg:px-16">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between md:mb-12">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e] transition-colors hover:text-amber-500"
          >
            ← The Foundry
          </button>

          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Book a Cut
          </div>
        </div>

        {/* Progress */}
        <BookingProgress currentStep={step} />

        {/* Slide */}
        <div className="relative mt-10 flex-1 md:mt-14">
          {catalog.loading ? (
            <LoadingBlock label="Preparing the chair…" />
          ) : catalog.error ? (
            <ErrorBlock
              message={catalog.error}
              onRetry={() => window.location.reload()}
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={
                  prefersReducedMotion ? false : { opacity: 0, x: 24 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="h-full"
              >
                {step === 1 && <SlideDate {...slideProps} />}
                {step === 2 && <SlideServiceBarber {...slideProps} />}
                {step === 3 && <SlideTime {...slideProps} />}
                {step === 4 && <SlideDetails {...slideProps} />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </main>
  );
};

/* ---------- Inline helper components ---------- */

const LoadingBlock = ({ label }) => (
  <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
    <div className="h-8 w-8 animate-spin border border-white/20 border-t-amber-500" />
    <p className="text-xs uppercase tracking-[0.3em] text-[#8f897e]">
      {label}
    </p>
  </div>
);

const ErrorBlock = ({ message, onRetry }) => (
  <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
    <p className="max-w-md text-sm text-[#aaa398]">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="border border-white/20 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition hover:border-amber-500 hover:text-amber-500"
    >
      Try Again
    </button>
  </div>
);

export default Book;