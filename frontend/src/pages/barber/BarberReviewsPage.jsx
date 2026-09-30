import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  RefreshCw,
  QrCode,
  Star,
  Download,
  Copy,
  Share2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

import useAuthStore from "../../store/authStore";
import { getMyReviewQR, getMyBarberReviews } from "../../services/barberService";

const EASE = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* Reusable star rating display                                        */
/* ------------------------------------------------------------------ */
export const StarRating = ({ value = 0 }) => {
  const numeric = Number(value);
  const rating = Number.isFinite(numeric)
    ? Math.min(5, Math.max(0, Math.round(numeric)))
    : 0;

  return (
    <div
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className="flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          aria-hidden="true"
          className={
            i <= rating
              ? "fill-amber-500 text-amber-500"
              : "text-[#625f58]"
          }
        />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* QR response normalization                                           */
/* ------------------------------------------------------------------ */
/*
 * Tolerant normalization: the project convention returns the Axios
 * payload directly (`response.data`) and pages already use
 * `res?.data ?? res`. The controller envelope was not available for
 * inspection, so the common shapes are handled without inventing
 * fields beyond those verified on the ReviewQR model.
 */
const normalizeQRResponse = (res) => {
  const payload = res?.data ?? res;

  const record =
    payload?.qr ??
    payload?.data?.qr ??
    (typeof payload?.publicId === "string" ? payload : null) ??
    (typeof payload?.data?.publicId === "string" ? payload.data : null);

  const publicId = record?.publicId;

  if (typeof publicId !== "string" || !publicId) return null;

  const createdAt =
    record?.createdAt && !Number.isNaN(new Date(record.createdAt).getTime())
      ? new Date(record.createdAt).toLocaleDateString()
      : null;

  return {
    publicId,
    /* ReviewQR schema default is active: true */
    active: record?.active !== false,
    createdAt,
  };
};

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
const BarberReviewsPage = () => {
  const prefersReducedMotion = useReducedMotion();
  const qrSectionRef = useRef(null);
  const mongoUser = useAuthStore((s) => s.mongoUser);

  const [qrInfo, setQrInfo] = useState(null);
  const [qrMissing, setQrMissing] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState(null);

  const [qrImage, setQrImage] = useState(null);
  const [qrImageError, setQrImageError] = useState(false);

  /* ---- Customer reviews state ---- */
  const [reviews, setReviews] = useState([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  /* ---------- Fetch QR info ---------- */
  const fetchQR = useCallback(async () => {
    setQrLoading(true);
    setQrError(null);
    setQrMissing(false);

    try {
      const res = await getMyReviewQR();
      const normalized = normalizeQRResponse(res);

      if (!normalized) {
        setQrInfo(null);
        setQrError(
          "Your review QR information was returned in an unexpected format."
        );
      } else {
        setQrInfo(normalized);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        /* No QR record exists for this barber yet */
        setQrInfo(null);
        setQrMissing(true);
      } else {
        setQrInfo(null);
        setQrError(
          err?.response?.data?.message ||
            "Unable to load your review QR code."
        );
      }
    } finally {
      setQrLoading(false);
    }
  }, []);

  /* ---------- Fetch approved reviews ---------- */
  const fetchReviews = useCallback(async () => {
    const barberId = mongoUser?.barberId;
    if (!barberId) return;

    setReviewsLoading(true);
    setReviewsError(null);

    try {
      const res = await getMyBarberReviews(barberId);
      const payload = res?.data ?? res;
      setReviews(payload?.reviews ?? []);
      setReviewsTotal(payload?.total ?? 0);
    } catch (err) {
      setReviews([]);
      setReviewsError(
        err?.response?.data?.message ||
          "Unable to load your customer reviews."
      );
    } finally {
      setReviewsLoading(false);
    }
  }, [mongoUser?.barberId]);

  useEffect(() => {
    fetchQR();
  }, [fetchQR]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* ---------- Derived public review URL ---------- */
  const reviewUrl = qrInfo
    ? `${window.location.origin}/review/qr/${encodeURIComponent(
        qrInfo.publicId
      )}`
    : "";

  /* ---------- Render QR image from the verified publicId ---------- */
  useEffect(() => {
    if (!qrInfo?.publicId) return undefined;

    let cancelled = false;
    setQrImage(null);
    setQrImageError(false);

    QRCode.toDataURL(reviewUrl, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#141311",
        light: "#e8e2d6",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrImage(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrImageError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [qrInfo?.publicId, reviewUrl]);

  /* ---------- Actions ---------- */

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyReviewLink = useCallback(async () => {
    if (!reviewUrl) return;

    try {
      await navigator.clipboard.writeText(reviewUrl);
      toast.success("Review link copied.");
    } catch {
      toast.error("Couldn't copy the review link.");
    }
  }, [reviewUrl]);

  const handleDownload = useCallback(() => {
    if (!qrImage) {
      toast.error("The QR image isn't ready yet. Please try again.");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = qrImage;
    anchor.download = "the-foundry-review-qr.png";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    toast.success("QR code downloaded.");
  }, [qrImage]);

  const handleShare = useCallback(async () => {
    if (!reviewUrl) return;

    if (canShare) {
      try {
        await navigator.share({
          title: "Leave me a review at The Foundry",
          url: reviewUrl,
        });
      } catch (err) {
        /* User closing the share sheet is not an error */
        if (err?.name !== "AbortError") {
          copyReviewLink();
        }
      }
    } else {
      copyReviewLink();
    }
  }, [canShare, reviewUrl, copyReviewLink]);

  const scrollToQR = () => {
    qrSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /* ------------------------------------------------------------------ */
  /* QR loading skeleton                                                */
  /* ------------------------------------------------------------------ */
  const renderLoading = () => (
    <div className="mt-10 grid gap-px border border-white/10 bg-white/5 lg:grid-cols-[240px_1fr]">
      <div className="h-64 animate-pulse bg-[#141311]" />
      <div className="h-64 animate-pulse bg-[#141311]" />
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* QR error state (independent — does not block the rest of the page) */
  /* ------------------------------------------------------------------ */
  const renderQRError = () => (
    <div className="mt-10 flex flex-col items-center border border-white/10 px-6 py-14 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
        Something went wrong
      </div>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8f897e]">
        {qrError}
      </p>
      <button
        type="button"
        onClick={fetchQR}
        className="mt-6 flex items-center gap-2 border border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
      >
        <RefreshCw size={13} />
        Try Again
      </button>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* QR missing state (404 — no QR record yet)                          */
  /* ------------------------------------------------------------------ */
  const renderQRMissing = () => (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mt-10 border border-white/10 px-6 py-14 text-center"
    >
      <QrCode size={20} className="mx-auto text-[#625f58]" />
      <div className="mt-4 text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
        No Review QR Code Yet
      </div>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#8f897e]">
        A review QR code hasn&apos;t been issued for your account yet. Please
        contact the shop manager to set one up.
      </p>
    </motion.div>
  );

  /* ------------------------------------------------------------------ */
  /* QR card                                                            */
  /* ------------------------------------------------------------------ */
  const renderQRCard = () => (
    <motion.div
      ref={qrSectionRef}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
      className="mt-10 grid border border-white/10 bg-white/[0.02] lg:grid-cols-[240px_1fr]"
    >
      {/* QR image */}
      <div className="flex items-center justify-center border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
        <div className="border border-white/10 bg-[#e8e2d6] p-3">
          {qrImage ? (
            <img
              src={qrImage}
              alt="Your review QR code"
              className="h-48 w-48"
            />
          ) : qrImageError ? (
            <div className="flex h-48 w-48 flex-col items-center justify-center text-center">
              <QrCode size={20} className="text-[#625f58]" />
              <p className="mt-3 px-4 text-[10px] leading-relaxed text-[#625f58]">
                Couldn&apos;t generate the QR image. Please retry.
              </p>
            </div>
          ) : (
            <div className="h-48 w-48 animate-pulse bg-[#d8d2c6]" />
          )}
        </div>
      </div>

      {/* Details + actions */}
      <div className="flex flex-col p-6 lg:p-8">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          Your Review QR Code
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-[#aaa398]">
          Customers can scan this QR code to leave a review about your work.
          Print it at your station or share the link directly after an
          appointment.
        </p>

        {!qrInfo.active && (
          <div className="mt-4 border border-red-500/30 px-4 py-3 text-[11px] text-red-400">
            This QR code is currently disabled. Reviews submitted through it
            will not be accepted.
          </div>
        )}

        {/* Public link */}
        <div className="mt-6 border border-white/10 bg-[#141311] px-4 py-3">
          <div className="text-[8px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
            Public Review Link
          </div>
          <div className="mt-1 truncate font-mono text-xs text-amber-500">
            {reviewUrl}
          </div>
        </div>

        {qrInfo.createdAt && (
          <div className="mt-3 text-[10px] text-[#625f58]">
            QR issued {qrInfo.createdAt}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrImage}
            className="flex items-center gap-2 border border-amber-500/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-500 transition-colors hover:border-amber-500 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={13} />
            Download QR Code
          </button>

          <button
            type="button"
            onClick={copyReviewLink}
            disabled={!reviewUrl}
            className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Copy size={13} />
            Copy Review Link
          </button>

          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              disabled={!reviewUrl}
              className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Share2 size={13} />
              Share
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  /* ------------------------------------------------------------------ */
  /* Customer reviews section                                           */
  /* ------------------------------------------------------------------ */
  const renderReviewsSection = () => {
    if (reviewsLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse border border-white/10 bg-[#141311]"
            />
          ))}
        </div>
      );
    }

    if (reviewsError) {
      return (
        <div className="flex flex-col items-center border border-white/10 px-6 py-14 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Something went wrong
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8f897e]">
            {reviewsError}
          </p>
          <button
            type="button"
            onClick={fetchReviews}
            className="mt-6 flex items-center gap-2 border border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
          >
            <RefreshCw size={13} />
            Try Again
          </button>
        </div>
      );
    }

    if (!reviews.length) {
      return (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="border border-white/10 px-6 py-14 text-center"
        >
          <MessageSquare size={20} className="mx-auto text-[#625f58]" />
          <div className="mt-4 text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
            No reviews yet
          </div>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#8f897e]">
            Your customer reviews will appear here once they are approved.
            Share your review QR code with customers after their appointment
            to invite feedback.
          </p>
          {!qrLoading && !qrError && !qrMissing && (
            <button
              type="button"
              onClick={scrollToQR}
              className="mt-6 inline-flex items-center gap-2 border border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
            >
              <QrCode size={13} />
              View Your QR Code
            </button>
          )}
        </motion.div>
      );
    }

    return (
      <div className="space-y-3">
        {reviews.map((review) => {
          const customerName =
            review.customer?.name || "Anonymous";
          const date = review.createdAt
            ? new Date(review.createdAt).toLocaleDateString()
            : null;

          return (
            <motion.div
              key={review._id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#e8e2d6]">
                      {customerName}
                    </span>
                    {date && (
                      <span className="text-[10px] text-[#625f58]">
                        {date}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <StarRating value={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-[#aaa398]">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {reviewsTotal > reviews.length && (
          <div className="pt-2 text-center text-[10px] text-[#625f58]">
            Showing {reviews.length} of {reviewsTotal} reviews
          </div>
        )}
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <div>
      {/* ---- Header ---- */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          <QrCode size={13} />
          Reviews &amp; QR
        </div>
        <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
          My Reviews
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
          Manage your review QR code and see what customers are saying about
          your work.
        </p>
      </motion.div>

      {/* ---- QR section (independent loading / error / empty states) ---- */}
      {qrLoading
        ? renderLoading()
        : qrError
          ? renderQRError()
          : qrMissing
            ? renderQRMissing()
            : renderQRCard()}

      {/* ---- Customer reviews ---- */}
      <div className="mt-12 border-t border-white/10 pt-8">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
          <MessageSquare size={13} className="text-amber-500" />
          Customer Reviews
          {reviewsTotal > 0 && (
            <span className="ml-1 text-amber-500">({reviewsTotal})</span>
          )}
        </div>

        {renderReviewsSection()}
      </div>
    </div>
  );
};

export default BarberReviewsPage;