import { useEffect, useMemo, useState } from "react";
import {
  X,
  Globe,
  Star,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBarberReviewSummary,
  getBarberReviews,
} from "../../services/bookingService.js";

const EASE = [0.22, 1, 0.36, 1];

const getPhotoUrl = (barber) =>
  barber?.photo?.url ||
  barber?.image ||
  barber?.photoUrl ||
  null;

const getSocialLinks = (barber) => barber?.socialLinks || {};

const normalizeReviews = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.reviews)) return payload.reviews;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getSummaryValue = (summary, keys, fallback = null) => {
  for (const key of keys) {
    if (
      summary &&
      summary[key] !== undefined &&
      summary[key] !== null
    ) {
      return summary[key];
    }
  }

  return fallback;
};

// Inline brand icons (lucide-react removed brand icons in v0.400+)
const InstagramIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const BarberProfileModal = ({
  barber,
  services = [],
  isOpen,
  onClose,
  onSelect,
  isSelected = false,
}) => {
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const photoUrl = getPhotoUrl(barber);
  const socialLinks = getSocialLinks(barber);

  useEffect(() => {
    if (!isOpen || !barber?._id || barber?.isAnyone) return;

    let cancelled = false;

    const loadReviews = async () => {
      setLoadingReviews(true);

      try {
        const [summaryResult, reviewsResult] = await Promise.all([
          getBarberReviewSummary(barber._id),
          getBarberReviews(barber._id),
        ]);

        if (cancelled) return;

        setSummary(summaryResult);
        setReviews(normalizeReviews(reviewsResult));
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load barber reviews:", error);
        setSummary(null);
        setReviews([]);
      } finally {
        if (!cancelled) {
          setLoadingReviews(false);
        }
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [isOpen, barber?._id, barber?.isAnyone]);

  const rating = useMemo(
    () =>
      getSummaryValue(
        summary,
        ["averageRating", "avgRating", "rating", "average"],
        null
      ),
    [summary]
  );

  const reviewCount = useMemo(
    () =>
      getSummaryValue(
        summary,
        ["totalReviews", "reviewCount", "count", "total"],
        reviews.length
      ),
    [summary, reviews.length]
  );

  const workingDays = useMemo(() => {
    if (!Array.isArray(barber?.workingHours)) return [];

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    return barber.workingHours
      .filter((day) => day?.isWorking)
      .map((day) => ({
        ...day,
        label: dayNames[day.day] || "Day",
      }));
  }, [barber?.workingHours]);

  if (!barber || barber.isAnyone) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-white/10 bg-[#181714] text-[#e8e2d6] md:max-h-[90vh]"
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close barber profile"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-white/15 bg-black/40 text-[#aaa398] transition hover:border-amber-500 hover:text-amber-500 sm:right-5 sm:top-5 sm:h-10 sm:w-10"
            >
              <X size={18} />
            </button>

            {/* Hero */}
            <div className="grid md:grid-cols-[0.85fr_1.15fr]">
              {/* Photo */}
              <div className="relative min-h-[280px] bg-[#11100e] sm:min-h-[360px] md:min-h-[500px]">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={barber.name}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-7xl font-black uppercase text-white/10 sm:min-h-[360px]">
                    {(barber.name || "?").charAt(0)}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-5 left-5 sm:bottom-6 sm:left-6">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                    The Foundry
                  </p>

                  <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                    {barber.name}
                  </h2>
                </div>
              </div>

              {/* Information */}
              <div className="flex flex-col p-5 sm:p-7 md:p-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                  Barber Profile
                </p>

                <h3 className="mt-3 text-xl font-bold uppercase tracking-tight sm:text-2xl">
                  {barber.name}
                </h3>

                {barber.bio && (
                  <p className="mt-4 max-w-xl text-xs leading-6 text-[#aaa398] sm:mt-5 sm:text-sm sm:leading-7">
                    {barber.bio}
                  </p>
                )}

                {/* Rating */}
                {rating !== null && (
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Star
                        size={16}
                        fill="currentColor"
                        className="text-amber-500"
                      />

                      <span className="font-bold text-amber-500">
                        {Number(rating).toFixed(1)}
                      </span>
                    </div>

                    <span className="text-xs text-[#77736c]">
                      {reviewCount}{" "}
                      {Number(reviewCount) === 1
                        ? "review"
                        : "reviews"}
                    </span>
                  </div>
                )}

                {/* Socials */}
                {(socialLinks.instagram ||
                  socialLinks.tiktok ||
                  socialLinks.facebook ||
                  socialLinks.website) && (
                  <div className="mt-7 flex flex-wrap items-center gap-2">
                    {socialLinks.instagram && (
                      <SocialLink
                        href={socialLinks.instagram}
                        label="Instagram"
                      >
                        <InstagramIcon size={16} />
                      </SocialLink>
                    )}

                    {socialLinks.tiktok && (
                      <SocialLink
                        href={socialLinks.tiktok}
                        label="TikTok"
                      >
                        <span className="text-xs font-bold">TT</span>
                      </SocialLink>
                    )}

                    {socialLinks.facebook && (
                      <SocialLink
                        href={socialLinks.facebook}
                        label="Facebook"
                      >
                        <FacebookIcon size={16} />
                      </SocialLink>
                    )}

                    {socialLinks.website && (
                      <SocialLink
                        href={socialLinks.website}
                        label="Website"
                      >
                        <Globe size={16} />
                      </SocialLink>
                    )}
                  </div>
                )}

                {/* Specialties */}
                {barber.specialties?.length > 0 && (
                  <ProfileSection title="Specialties">
                    <div className="flex flex-wrap gap-2">
                      {barber.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#aaa398]"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </ProfileSection>
                )}

                {/* Services */}
                <ProfileSection title="Services">
                  {services.length > 0 ? (
                    <div className="divide-y divide-white/10 border-y border-white/10">
                      {services.map((service) => (
                        <div
                          key={service._id || service.id || service.slug}
                          className="flex items-center justify-between gap-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold uppercase tracking-wider">
                              {service.name || service.title}
                            </p>

                            {service.description && (
                              <p className="mt-1 line-clamp-1 text-[10px] text-[#77736c]">
                                {service.description}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 text-sm font-bold text-amber-500">
                            ${service.price ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#77736c]">
                      Services are currently unavailable.
                    </p>
                  )}
                </ProfileSection>

                {/* Working hours */}
                {workingDays.length > 0 && (
                  <ProfileSection title="Working Hours">
                    <div className="space-y-2">
                      {workingDays.map((day) => (
                        <div
                          key={day.day}
                          className="flex justify-between gap-4 text-xs"
                        >
                          <span className="text-[#aaa398]">
                            {day.label}
                          </span>

                          <span className="font-medium">
                            {day.startTime} — {day.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ProfileSection>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="border-t border-white/10 p-5 sm:p-7 md:p-10">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                    Client Feedback
                  </p>

                  <h3 className="mt-2 text-xl font-bold uppercase sm:text-2xl">
                    Reviews
                  </h3>
                </div>

                {rating !== null && (
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-amber-500">
                      <Star size={14} fill="currentColor" />
                      <span className="font-bold">
                        {Number(rating).toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-1 text-[10px] uppercase tracking-wider text-[#625f58]">
                      {reviewCount} reviews
                    </p>
                  </div>
                )}
              </div>

              {loadingReviews ? (
                <div className="py-10 text-center text-[10px] uppercase tracking-[0.25em] text-[#625f58]">
                  Loading reviews…
                </div>
              ) : reviews.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.slice(0, 4).map((review, index) => (
                    <ReviewCard
                      key={
                        review._id ||
                        review.id ||
                        `review-${index}`
                      }
                      review={review}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-sm text-[#77736c]">
                  No reviews yet.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-white/10 bg-[#181714]/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition hover:text-white"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelect?.(barber);
                  onClose();
                }}
                className={`inline-flex items-center justify-center gap-3 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition ${
                  isSelected
                    ? "border border-amber-500 text-amber-500"
                    : "bg-amber-500 text-black hover:bg-amber-400"
                }`}
              >
                {isSelected && <Check size={14} />}
                {isSelected
                  ? "Selected"
                  : `Book with ${barber.name}`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ProfileSection = ({ title, children }) => (
  <section className="mt-8">
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
      {title}
    </p>

    {children}
  </section>
);

const SocialLink = ({ href, label, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    title={label}
    className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#8f897e] transition hover:border-amber-500 hover:text-amber-500"
  >
    {children}
  </a>
);

const ReviewCard = ({ review }) => {
  const rating = Number(review.rating || 0);

  return (
    <div className="border border-white/10 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-1 text-amber-500">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={12}
            fill={index < rating ? "currentColor" : "none"}
          />
        ))}
      </div>

      {review.comment && (
        <p className="text-xs leading-5 text-[#aaa398] sm:text-sm sm:leading-6">
          “{review.comment}”
        </p>
      )}

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#625f58]">
        {review.customer?.name ||
          review.customerName ||
          review.name ||
          "Verified Client"}
      </p>
    </div>
  );
};

export default BarberProfileModal;