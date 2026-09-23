import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import useBookingStore from "../../store/bookingStore";

const EASE = [0.22, 1, 0.36, 1];

/* Synthetic barber — lets users request any available chair. */
const ANYONE = {
  _id: "anyone",
  id: "anyone",
  slug: "anyone",
  name: "Anyone Available",
  role: "First available barber",
  isAnyone: true,
};

const pickId = (obj) => obj?._id || obj?.id || obj?.slug;

const SlideServiceBarber = ({ catalog, navigate }) => {
  const prefersReducedMotion = useReducedMotion();

  const service = useBookingStore((s) => s.service);
  const barber = useBookingStore((s) => s.barber);
  const setService = useBookingStore((s) => s.setService);
  const setBarber = useBookingStore((s) => s.setBarber);
  const nextStep = useBookingStore((s) => s.nextStep);

  const services = catalog?.services || [];
  const barbers = [ANYONE, ...(catalog?.barbers || [])];

  const serviceId = pickId(service);
  const barberId = pickId(barber);
  const canContinue = Boolean(service && barber);

  return (
    <div className="flex flex-col gap-10 md:gap-12">
      {/* ---------- Header ---------- */}
      <div>
        <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          <span className="h-px w-8 bg-amber-500" />
          Step 01 — Barber + Service
        </div>

        <h1 className="max-w-2xl text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl lg:text-5xl">
          Who&apos;s cutting,
          <br />
          <span className="text-[#8f897e]">and what are we doing?</span>
        </h1>
      </div>

      {/* ---------- Two columns ---------- */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
        {/* ---- BARBERS (moved first: barber is selected before service) ---- */}
        <div className="md:order-1">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
              Barbers
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#625f58]">
              {barbers.length} options
            </span>
          </div>

          <ul className="flex flex-col">
            {barbers.map((b, i) => {
              const id = pickId(b);
              const isSelected = id === barberId;

              return (
                <motion.li
                  key={id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: prefersReducedMotion ? 0 : i * 0.04,
                    ease: EASE,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBarber(b)}
                    aria-pressed={isSelected}
                    className={`group flex w-full items-center gap-4 border-b py-5 text-left transition-colors duration-200 ${
                      isSelected
                        ? "border-amber-500"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    {/* Avatar / marker */}
                    {b.isAnyone ? (
                      <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center border text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                          isSelected
                            ? "border-amber-500 bg-amber-500 text-black"
                            : "border-white/25 text-[#8f897e] group-hover:border-white/50"
                        }`}
                      >
                        ANY
                      </span>
                    ) : b.image ? (
                      <span
                        className={`relative h-10 w-10 flex-shrink-0 overflow-hidden border transition-colors ${
                          isSelected ? "border-amber-500" : "border-white/15"
                        }`}
                      >
                        <img
                          src={b.image}
                          alt=""
                          className="h-full w-full object-cover object-top"
                        />
                        {isSelected && (
                          <span className="absolute inset-0 bg-amber-500/25" />
                        )}
                      </span>
                    ) : (
                      <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center border text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                          isSelected
                            ? "border-amber-500 bg-amber-500 text-black"
                            : "border-white/25 text-[#8f897e] group-hover:border-white/50"
                        }`}
                      >
                        {(b.name || "?").charAt(0)}
                      </span>
                    )}

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm font-bold uppercase tracking-wider transition-colors ${
                          isSelected
                            ? "text-amber-500"
                            : "text-[#e8e2d6] group-hover:text-white"
                        }`}
                      >
                        {b.name}
                      </div>

                      {(b.role || b.title) && (
                        <div className="mt-0.5 truncate text-[11px] text-[#8f897e]">
                          {b.role || b.title}
                        </div>
                      )}
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center border border-amber-500 bg-amber-500">
                        <Check size={12} strokeWidth={3} className="text-black" />
                      </span>
                    )}
                  </button>
                </motion.li>
              );
            })}
          </ul>

          <p className="mt-4 text-[11px] leading-relaxed text-[#625f58]">
            Choose &ldquo;Anyone Available&rdquo; to have the first free
            chair assigned to you.
          </p>
        </div>

        {/* ---- SERVICES ---- */}
        <div className="md:order-2">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
              Services
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#625f58]">
              {services.length} options
            </span>
          </div>

          <ul className="flex flex-col">
            {services.length === 0 && (
              <li className="border border-white/10 p-5 text-xs uppercase tracking-[0.2em] text-[#625f58]">
                No services available.
              </li>
            )}

            {services.map((s, i) => {
              const id = pickId(s);
              const isSelected = id === serviceId;

              return (
                <motion.li
                  key={id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: prefersReducedMotion ? 0 : i * 0.04,
                    ease: EASE,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setService(s)}
                    aria-pressed={isSelected}
                    className={`group flex w-full items-center justify-between gap-4 border-b py-5 text-left transition-colors duration-200 ${
                      isSelected
                        ? "border-amber-500"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Selection marker */}
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-500"
                            : "border-white/25 group-hover:border-white/50"
                        }`}
                      >
                        {isSelected && (
                          <Check size={12} strokeWidth={3} className="text-black" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <div
                          className={`truncate text-sm font-bold uppercase tracking-wider transition-colors ${
                            isSelected
                              ? "text-amber-500"
                              : "text-[#e8e2d6] group-hover:text-white"
                          }`}
                        >
                          {s.name || s.title}
                        </div>

                        {s.description && (
                          <div className="mt-0.5 line-clamp-1 text-[11px] text-[#8f897e]">
                            {s.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`flex-shrink-0 text-sm font-bold transition-colors ${
                        isSelected ? "text-amber-500" : "text-[#e8e2d6]"
                      }`}
                    >
                      ${s.price ?? "—"}
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ---------- Footer nav ---------- */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        {/* Step 01: no previous step in the booking flow — "Back" exits to home */}
        <button
          type="button"
          onClick={() => navigate?.("/")}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500"
        >
          <ChevronLeft size={14} /> The Foundry
        </button>

        <button
          type="button"
          disabled={!canContinue}
          onClick={() => canContinue && nextStep()}
          className={`inline-flex items-center gap-3 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
            canContinue
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

export default SlideServiceBarber;