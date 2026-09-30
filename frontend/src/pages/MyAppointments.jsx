
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Scissors,
  UserRound,
  X,
  RefreshCw,
  Star,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

import {
  getMyAppointments,
  cancelMyAppointment,
  getEligibleReviewAppointments,
  createReview,
} from "../services/public";

const formatDate = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
};

const getAppointmentDateTime = (appointment) => {
  const date = new Date(appointment.date);

  const [hours, minutes] = (appointment.startTime || "00:00")
    .split(":")
    .map(Number);

  date.setUTCHours(hours, minutes, 0, 0);

  return date;
};

const isUpcoming = (appointment) => {
  const status = appointment.status?.toLowerCase();

  if (["cancelled", "completed", "no_show"].includes(status)) {
    return false;
  }

  return getAppointmentDateTime(appointment) >= new Date();
};

const statusStyles = {
  confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  no_show: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

// ============================================
// APPOINTMENT CARD
// ============================================

function AppointmentCard({ appointment, onCancel, cancelling }) {
  const status = appointment.status?.toLowerCase() || "confirmed";

  const serviceName =
    appointment.service?.name ||
    appointment.serviceName ||
    "Barber Service";

  const barberName =
    appointment.barber?.name ||
    appointment.barberName ||
    "Your Barber";

  const canCancel =
    ["confirmed", "pending"].includes(status) &&
    isUpcoming(appointment);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-black/10 bg-[#f5f0e8] p-5 md:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                statusStyles[status] ||
                "bg-black/5 text-black/70 border-black/10"
              }`}
            >
              {status.replace("_", " ")}
            </span>

            <span className="text-xs uppercase tracking-[0.15em] text-black/45">
              Appointment
            </span>
          </div>

          <div>
            <h3 className="font-serif text-2xl text-[#171513]">
              {serviceName}
            </h3>

            <div className="mt-3 grid gap-2 text-sm text-black/65 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} />
                <span>{formatDate(appointment.date)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock3 size={16} />
                <span>
                  {appointment.startTime || "—"}
                  {appointment.endTime
                    ? ` – ${appointment.endTime}`
                    : ""}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <UserRound size={16} />
                <span>{barberName}</span>
              </div>

              <div className="flex items-center gap-2">
                <Scissors size={16} />
                <span>
                  {appointment.price != null
                    ? `$${appointment.price}`
                    : "Price unavailable"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(appointment)}
            disabled={cancelling === appointment._id}
            className="flex items-center justify-center gap-2 border border-red-900/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-red-800 transition hover:bg-red-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={15} />
            {cancelling === appointment._id
              ? "Cancelling..."
              : "Cancel"}
          </button>
        )}
      </div>

      {appointment.notes && (
        <div className="mt-5 border-t border-black/10 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Notes
          </p>
          <p className="mt-1 text-sm text-black/65">
            {appointment.notes}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// QR REVIEW FORM
// ============================================

function QRReviewForm({
  barberId,
  onBack,
}) {
  const navigate = useNavigate();

  const [eligibleAppointments, setEligibleAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const loadEligibleAppointments = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getEligibleReviewAppointments(barberId);

        // Supports the standard sendSuccess response
        // and the nested response format.
        const appointments =
          response?.data?.appointments ??
          response?.appointments ??
          [];

        if (!Array.isArray(appointments)) {
          throw new Error(
            "Unexpected eligible appointments response."
          );
        }

        if (active) {
          setEligibleAppointments(appointments);

          // Automatically select the most recent eligible visit.
          if (appointments.length > 0) {
            setSelectedAppointment(
              appointments[0]._id
            );
          }
        }
      } catch (err) {
        console.error(
          "Failed to load eligible review appointments:",
          err
        );

        if (active) {
          if (err?.response?.status === 401) {
            navigate("/login", {
              state: {
                from: "/my-appointments",
                reviewFlow: true,
                reviewBarberId: barberId,
              },
            });
            return;
          }

          setError(
            err?.response?.data?.message ||
              err.message ||
              "Unable to load eligible appointments."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (barberId) {
      loadEligibleAppointments();
    } else {
      setError("Missing barber information.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [barberId, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedAppointment) {
      setError("Please select an appointment.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Please select a star rating.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createReview({
        appointment: selectedAppointment,
        barber: barberId,
        rating,
        comment: comment.trim(),
        source: "qr",
      });

      setSuccess(true);
    } catch (err) {
      console.error("Failed to submit review:", err);

      if (err?.response?.status === 401) {
        navigate("/login", {
          state: {
            from: "/my-appointments",
            reviewFlow: true,
            reviewBarberId: barberId,
          },
        });
        return;
      }

      setError(
        err?.response?.data?.message ||
          "Unable to submit your review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-black/10 bg-[#f5f0e8] px-6 py-16 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-[#b4512c]" />
        <p className="text-xs uppercase tracking-[0.2em] text-black/45">
          Finding your completed visits
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-green-900/20 bg-[#f5f0e8] px-6 py-16 text-center"
      >
        <CheckCircle2
          size={44}
          className="mx-auto mb-5 text-green-700"
        />

        <h2 className="font-serif text-3xl">
          Thank you for your review.
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/55">
          Your feedback has been submitted and is awaiting
          moderation.
        </p>

        <button
          type="button"
          onClick={() => {
            onBack();
            navigate("/my-appointments", {
              replace: true,
            });
          }}
          className="mt-8 border border-black/15 px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition hover:bg-black hover:text-white"
        >
          View appointments
        </button>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-black/10 bg-[#f5f0e8] p-6 md:p-10"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-black/50 transition hover:text-[#b4512c]"
      >
        <ArrowLeft size={15} />
        Back to appointments
      </button>

      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b4512c]">
        The Foundry
      </p>

      <h2 className="font-serif text-3xl md:text-4xl">
        How was your visit?
      </h2>

      <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">
        Select the completed appointment you're reviewing
        and tell us about your experience.
      </p>

      {error && (
        <div className="mt-6 border border-red-900/20 bg-red-900/5 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {eligibleAppointments.length === 0 ? (
        <div className="mt-8 border border-dashed border-black/15 px-6 py-12 text-center">
          <CalendarDays
            size={30}
            className="mx-auto mb-4 text-black/25"
          />

          <h3 className="font-serif text-xl">
            No eligible visits found
          </h3>

          <p className="mt-2 text-sm leading-6 text-black/50">
            Only completed appointments that haven't
            already been reviewed can be selected.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Appointment selector */}
          <div>
            <label
              htmlFor="review-appointment"
              className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50"
            >
              Select completed appointment
            </label>

            <select
              id="review-appointment"
              value={selectedAppointment}
              onChange={(event) =>
                setSelectedAppointment(event.target.value)
              }
              required
              className="w-full border border-black/15 bg-transparent px-4 py-4 text-sm outline-none focus:border-[#b4512c]"
            >
              <option value="">
                Choose your appointment
              </option>

              {eligibleAppointments.map((appointment) => (
                <option
                  key={appointment._id}
                  value={appointment._id}
                >
                  {formatDate(appointment.date)}
                  {" · "}
                  {appointment.startTime || ""}
                  {" · "}
                  {appointment.service?.name ||
                    "Barber Service"}
                </option>
              ))}
            </select>
          </div>

          {/* Star rating */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
              Your rating
            </p>

            <div
              className="flex items-center gap-2"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} out of 5 stars`}
                  onMouseEnter={() => setHoverRating(star)}
                  onFocus={() => setHoverRating(star)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition hover:scale-110"
                >
                  <Star
                    size={30}
                    className={
                      star <= (hoverRating || rating)
                        ? "fill-[#b4512c] text-[#b4512c]"
                        : "text-black/20"
                    }
                  />
                </button>
              ))}

              <span className="ml-3 text-sm text-black/50">
                {rating > 0
                  ? `${rating} / 5`
                  : "Select a rating"}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="review-comment"
              className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50"
            >
              Tell us more (optional)
            </label>

            <textarea
              id="review-comment"
              value={comment}
              onChange={(event) =>
                setComment(event.target.value)
              }
              maxLength={1000}
              rows={5}
              placeholder="Share your experience with your barber..."
              className="w-full resize-y border border-black/15 bg-transparent px-4 py-4 text-sm leading-6 outline-none placeholder:text-black/30 focus:border-[#b4512c]"
            />

            <p className="mt-2 text-right text-xs text-black/35">
              {comment.length}/1000
            </p>
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !selectedAppointment ||
              rating < 1
            }
            className="w-full bg-[#b4512c] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#963f21] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Submitting review..."
              : "Submit review"}
          </button>
        </form>
      )}
    </motion.section>
  );
}

// ============================================
// MY APPOINTMENTS PAGE
// ============================================

export default function MyAppointments() {
  const location = useLocation();
  const navigate = useNavigate();

  const reviewBarberId =
    location.state?.reviewBarberId || null;

  const reviewFlow =
    location.state?.reviewFlow === true &&
    Boolean(reviewBarberId);

  const [showReview, setShowReview] = useState(reviewFlow);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);

  const loadAppointments = async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getMyAppointments();

      const data = response?.data;

      setAppointments(
        Array.isArray(data?.appointments)
          ? data.appointments
          : []
      );
    } catch (err) {
      console.error("Failed to load appointments:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load your appointments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    setShowReview(reviewFlow);
  }, [reviewFlow]);

  const upcomingAppointments = useMemo(
    () => appointments.filter(isUpcoming),
    [appointments]
  );

  const historyAppointments = useMemo(
    () => appointments.filter(
      (appointment) => !isUpcoming(appointment)
    ),
    [appointments]
  );

  const handleCancel = async (appointment) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    try {
      setCancelling(appointment._id);

      await cancelMyAppointment(appointment._id);

      await loadAppointments(true);
    } catch (err) {
      console.error("Failed to cancel appointment:", err);

      window.alert(
        err?.response?.data?.message ||
          "Unable to cancel this appointment."
      );
    } finally {
      setCancelling(null);
    }
  };

  const handleBackFromReview = () => {
    setShowReview(false);

    // Remove QR navigation state so refresh doesn't reopen
    // the review form after the user exits it.
    navigate("/my-appointments", {
      replace: true,
      state: {},
    });
  };

  return (
    <main className="min-h-screen bg-[#ebe5da] px-5 py-24 text-[#171513] md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#b4512c]">
              The Foundry
            </p>

            <h1 className="font-serif text-4xl md:text-5xl">
              {showReview
                ? "Leave a Review"
                : "My Appointments"}
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">
              {showReview
                ? "Your feedback helps us keep the craft alive."
                : "Keep track of your upcoming cuts and your appointment history."}
            </p>
          </div>

          {!showReview && (
            <button
              type="button"
              onClick={() => loadAppointments(true)}
              disabled={refreshing}
              className="flex w-fit items-center gap-2 border border-black/15 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition hover:bg-black hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          )}
        </div>

        {showReview && reviewBarberId ? (
          <QRReviewForm
            barberId={reviewBarberId}
            onBack={handleBackFromReview}
          />
        ) : (
          <>
            {error && (
              <div className="mb-8 border border-red-900/20 bg-red-900/5 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-[#b4512c]" />
                  <p className="text-xs uppercase tracking-[0.2em] text-black/45">
                    Loading appointments
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-14">
                {/* Upcoming */}
                <section>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b4512c]">
                        Next up
                      </p>

                      <h2 className="mt-1 font-serif text-3xl">
                        Upcoming
                      </h2>
                    </div>

                    <span className="text-sm text-black/40">
                      {upcomingAppointments.length}
                    </span>
                  </div>

                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          onCancel={handleCancel}
                          cancelling={cancelling}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-black/15 px-6 py-14 text-center">
                      <CalendarDays
                        className="mx-auto mb-4 text-black/25"
                        size={30}
                      />

                      <h3 className="font-serif text-xl">
                        No upcoming appointments
                      </h3>

                      <p className="mt-2 text-sm text-black/45">
                        Ready for a fresh cut?
                      </p>
                    </div>
                  )}
                </section>

                {/* History */}
                <section>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                        Past visits
                      </p>

                      <h2 className="mt-1 font-serif text-3xl">
                        History
                      </h2>
                    </div>

                    <span className="text-sm text-black/40">
                      {historyAppointments.length}
                    </span>
                  </div>

                  {historyAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {historyAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          onCancel={handleCancel}
                          cancelling={cancelling}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-black/15 px-6 py-14 text-center">
                      <Clock3
                        className="mx-auto mb-4 text-black/25"
                        size={30}
                      />

                      <h3 className="font-serif text-xl">
                        No appointment history
                      </h3>

                      <p className="mt-2 text-sm text-black/45">
                        Your completed and cancelled appointments will appear here.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}