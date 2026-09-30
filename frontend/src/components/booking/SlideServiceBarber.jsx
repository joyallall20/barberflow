import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Globe,
} from "lucide-react";

import useBookingStore from "../../store/bookingStore";
import BarberProfileModal from "./BarberProfileModal";

const EASE = [0.22, 1, 0.36, 1];

/* Inline brand icons — lucide-react removed brand icons (Instagram, Facebook, etc.) in v0.400+ */
const InstagramIcon = ({ size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

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

const getPhotoUrl = (barber) =>
  barber?.photo?.url ||
  barber?.image ||
  barber?.photoUrl ||
  null;

const SlideServiceBarber = ({ catalog, navigate }) => {
  const prefersReducedMotion = useReducedMotion();

  const [profileBarber, setProfileBarber] = useState(null);

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
    <>
      <div className="flex flex-col gap-8 sm:gap-10 md:gap-12">
        {/* ---------- Header ---------- */}
        <div>
          <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            <span className="h-px w-8 bg-amber-500" />
            <span className="leading-tight">
              Step 01 — Barber + Service
            </span>
          </div>

          <h1 className="max-w-2xl text-2xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
            Who&apos;s cutting,
            <br />
            <span className="text-[#8f897e]">
              and what are we doing?
            </span>
          </h1>
        </div>

        {/* ---------- Two columns ---------- */}
        <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 md:gap-12">
          {/* ======================================================
              BARBERS
          ====================================================== */}
          <div className="md:order-1">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
                Barbers
              </span>

              <span className="text-[10px] uppercase tracking-[0.2em] text-[#625f58]">
                {barbers.length} options
              </span>
            </div>

            <ul className="flex flex-col gap-3">
              {barbers.map((b, i) => {
                const id = pickId(b);
                const isSelected = id === barberId;

                return (
                  <motion.li
                    key={id}
                    initial={
                      prefersReducedMotion
                        ? false
                        : { opacity: 0, y: 8 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: prefersReducedMotion
                        ? 0
                        : i * 0.04,
                      ease: EASE,
                    }}
                  >
                    {/* Anyone Available */}
                    {b.isAnyone ? (
                      <button
                        type="button"
                        onClick={() => setBarber(b)}
                        aria-pressed={isSelected}
                        className={`group flex w-full items-center gap-3 border p-3 text-left transition sm:gap-4 sm:p-4 ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/[0.06]"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center border text-[9px] font-bold uppercase tracking-[0.15em] sm:h-12 sm:w-12 ${
                            isSelected
                              ? "border-amber-500 bg-amber-500 text-black"
                              : "border-white/25 text-[#8f897e]"
                          }`}
                        >
                          ANY
                        </span>

                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-bold uppercase tracking-wider sm:text-sm ${
                              isSelected
                                ? "text-amber-500"
                                : "text-[#e8e2d6]"
                            }`}
                          >
                            Anyone Available
                          </div>

                          <div className="mt-1 text-[11px] text-[#8f897e]">
                            First available barber
                          </div>
                        </div>

                        {isSelected && (
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-amber-500">
                            <Check
                              size={13}
                              strokeWidth={3}
                              className="text-black"
                            />
                          </span>
                        )}
                      </button>
                    ) : (
                      <div
                        className={`border transition ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/[0.04]"
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        {/* Main selection area */}
                        <button
                          type="button"
                          onClick={() => setBarber(b)}
                          aria-pressed={isSelected}
                          className="group flex w-full gap-3 p-3 text-left sm:gap-4 sm:p-4"
                        >
                          {/* Photo */}
                          <div
                            className={`relative h-20 w-16 flex-shrink-0 overflow-hidden border sm:h-24 sm:w-20 ${
                              isSelected
                                ? "border-amber-500"
                                : "border-white/15"
                            }`}
                          >
                            {getPhotoUrl(b) ? (
                              <img
                                src={getPhotoUrl(b)}
                                alt={b.name}
                                className="h-full w-full object-cover object-top"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#11100e] text-xl font-black uppercase text-white/20">
                                {(b.name || "?").charAt(0)}
                              </div>
                            )}

                            {isSelected && (
                              <span className="absolute inset-0 bg-amber-500/15" />
                            )}
                          </div>

                          {/* Information */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div
                                  className={`truncate text-xs font-bold uppercase tracking-wider sm:text-sm ${
                                    isSelected
                                      ? "text-amber-500"
                                      : "text-[#e8e2d6]"
                                  }`}
                                >
                                  {b.name}
                                </div>

                                {b.role || b.title ? (
                                  <div className="mt-1 truncate text-[10px] uppercase tracking-[0.15em] text-[#625f58]">
                                    {b.role || b.title}
                                  </div>
                                ) : null}
                              </div>

                              {isSelected && (
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-amber-500">
                                  <Check
                                    size={13}
                                    strokeWidth={3}
                                    className="text-black"
                                  />
                                </span>
                              )}
                            </div>

                            {/* Bio */}
                            {b.bio && (
                              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#8f897e] sm:mt-3">
                                {b.bio}
                              </p>
                            )}

                            {/* Specialties */}
                            {b.specialties?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3">
                                {b.specialties
                                  .slice(0, 3)
                                  .map((specialty) => (
                                    <span
                                      key={specialty}
                                      className="border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[0.1em] text-[#77736c]"
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Bottom actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
                          {/* Socials */}
                          <div className="flex items-center gap-1.5">
                            {b.socialLinks?.instagram && (
                              <a
                                href={b.socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${b.name} Instagram`}
                                className="flex h-7 w-7 items-center justify-center text-[#625f58] transition hover:text-amber-500"
                              >
                                <InstagramIcon size={13} />
                              </a>
                            )}

                            {b.socialLinks?.tiktok && (
                              <a
                                href={b.socialLinks.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${b.name} TikTok`}
                                className="flex h-7 w-7 items-center justify-center text-[9px] font-bold text-[#625f58] transition hover:text-amber-500"
                              >
                                TT
                              </a>
                            )}

                            {b.socialLinks?.facebook && (
                              <a
                                href={b.socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${b.name} Facebook`}
                                className="flex h-7 w-7 items-center justify-center text-[#625f58] transition hover:text-amber-500"
                              >
                                <FacebookIcon size={13} />
                              </a>
                            )}

                            {b.socialLinks?.website && (
                              <a
                                href={b.socialLinks.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${b.name} website`}
                                className="flex h-7 w-7 items-center justify-center text-[#625f58] transition hover:text-amber-500"
                              >
                                <Globe size={13} />
                              </a>
                            )}
                          </div>

                          {/* Profile */}
                          <button
                            type="button"
                            onClick={() => setProfileBarber(b)}
                            className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#aaa398] transition hover:text-amber-500"
                          >
                            View Full Profile →
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>

            <p className="mt-4 text-[11px] leading-relaxed text-[#625f58]">
              Choose &ldquo;Anyone Available&rdquo; to have the first
              free chair assigned to you.
            </p>
          </div>

          {/* ======================================================
              SERVICES
          ====================================================== */}
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
                    initial={
                      prefersReducedMotion
                        ? false
                        : { opacity: 0, y: 8 }
                    }
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
                      className={`group flex w-full items-center justify-between gap-3 border-b py-4 text-left transition-colors duration-200 sm:gap-4 sm:py-5 ${
                        isSelected
                          ? "border-amber-500"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <span
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-white/25 group-hover:border-white/50"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              strokeWidth={3}
                              className="text-black"
                            />
                          )}
                        </span>

                        <div className="min-w-0">
                          <div
                            className={`truncate text-xs font-bold uppercase tracking-wider sm:text-sm ${
                              isSelected
                                ? "text-amber-500"
                                : "text-[#e8e2d6]"
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
                        className={`flex-shrink-0 text-xs font-bold sm:text-sm ${
                          isSelected
                            ? "text-amber-500"
                            : "text-[#e8e2d6]"
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
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={() => navigate?.("/")}
            className="inline-flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500 sm:justify-start"
          >
            <ChevronLeft size={14} /> The Foundry
          </button>

          <button
            type="button"
            disabled={!canContinue}
            onClick={() => canContinue && nextStep()}
            className={`inline-flex items-center justify-center gap-3 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
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

      {/* ==========================================================
          FULL BARBER PROFILE
      ========================================================== */}
      <BarberProfileModal
        barber={profileBarber}
        services={services}
        isOpen={Boolean(profileBarber)}
        onClose={() => setProfileBarber(null)}
        onSelect={(selectedBarber) => setBarber(selectedBarber)}
        isSelected={
          profileBarber
            ? pickId(profileBarber) === barberId
            : false
        }
      />
    </>
  );
};

export default SlideServiceBarber;