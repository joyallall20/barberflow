import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Copy, Download, RefreshCw, QrCode } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  getBarberReviewQR,
  createBarberReviewQR,
  regenerateBarberReviewQR,
  updateBarberReviewQRStatus,
  updateBarber,
} from "../../services/admin.js";

const EASE = [0.22, 1, 0.36, 1];

const BarberReviewQRModal = ({ barber, onClose }) => {
  const prefersReducedMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [qrMeta, setQrMeta] = useState(null);        // QR metadata from backend
  const [qrImageUrl, setQrImageUrl] = useState(null); // data-URL of the generated QR image
  const [publicUrl, setPublicUrl] = useState("");      // permanent public review URL
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Google & Yelp review links
  const [reviewLinks, setReviewLinks] = useState({
    google: "",
    yelp: "",
  });
  const [savingLinks, setSavingLinks] = useState(false);

  const barberId = barber?._id ?? barber?.id;

  // -----------------------------------------------------------
  // Build a QR image from a public URL
  // -----------------------------------------------------------
  const generateQRImage = async (url) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 3,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      return dataUrl;
    } catch {
      toast.error("Failed to generate QR code image.");
      return null;
    }
  };

  // -----------------------------------------------------------
  // Fetch existing QR metadata on mount
  // -----------------------------------------------------------
  const fetchQRMetadata = useCallback(async () => {
    if (!barberId) return;

    try {
      setLoading(true);
      setError("");

      const result = await getBarberReviewQR(barberId);
      const qr = result.data.qr;

      setQrMeta(qr);

      // Load saved review links (if any)
      const savedLinks = result.data.barber?.reviewLinks || {};
      setReviewLinks({
        google: savedLinks.google || "",
        yelp: savedLinks.yelp || "",
      });

      if (qr?.publicUrl) {
        setPublicUrl(qr.publicUrl);

        const image = await generateQRImage(qr.publicUrl);
        setQrImageUrl(image);
      } else {
        setPublicUrl("");
        setQrImageUrl(null);
      }
    } catch (err) {
      if (err?.isNotFound || err?.status === 404) {
        setQrMeta(null);
        setPublicUrl("");
        setQrImageUrl(null);
        // Leave link fields as-is (or empty) — admin can still configure them
      } else {
        setError(err?.message || "Failed to load QR information.");
      }
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    fetchQRMetadata();
  }, [fetchQRMetadata]);

  // -----------------------------------------------------------
  // Create a new QR (first time)
  // -----------------------------------------------------------
  const handleCreate = async () => {
    try {
      setSubmitting(true);
      setError("");

      const result = await createBarberReviewQR(barberId);
      const qr = result.data.qr;

      setQrMeta(qr);

      const url = qr.publicUrl;
      setPublicUrl(url);

      const imgUrl = await generateQRImage(url);
      setQrImageUrl(imgUrl);

      toast.success("Review QR code created successfully.");
    } catch (err) {
      if (err?.status === 409) {
        // QR already exists – refresh metadata
        toast.info("A QR code already exists for this barber.");
        await fetchQRMetadata();
      } else {
        setError(err?.message || "Failed to create QR code.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------
  // Refresh QR image (permanent URL is preserved)
  // -----------------------------------------------------------
  const handleRegenerate = async () => {
    try {
      setSubmitting(true);
      setError("");
      setShowRegenConfirm(false);

      const result = await regenerateBarberReviewQR(barberId);
      const qr = result.data.qr;

      setQrMeta(qr);

      const url = qr.publicUrl;
      setPublicUrl(url);

      const imgUrl = await generateQRImage(url);
      setQrImageUrl(imgUrl);

      toast.success("Review QR code refreshed successfully.");
    } catch (err) {
      setError(err?.message || "Failed to refresh QR code.");
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------
  // Toggle active / inactive
  // -----------------------------------------------------------
  const handleToggleActive = async () => {
    if (!qrMeta) return;
    const newStatus = !qrMeta.active;

    if (!newStatus) {
      const ok = window.confirm(
        "Deactivating this QR code will prevent customers from using it to leave reviews. Continue?"
      );
      if (!ok) return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await updateBarberReviewQRStatus(barberId, newStatus);
      // Merge the returned qr data with existing metadata to keep dates
      setQrMeta((prev) => ({ ...prev, ...result.data.qr }));
      toast.success(newStatus ? "QR code activated" : "QR code deactivated");
    } catch (err) {
      setError(err?.message || "Failed to update QR code status.");
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------
  // Copy URL to clipboard
  // -----------------------------------------------------------
  const copyUrl = async () => {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Review URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL. Please copy it manually.");
    }
  };

  // -----------------------------------------------------------
  // Download QR image as PNG
  // -----------------------------------------------------------
  const downloadQR = () => {
    if (!qrImageUrl) return;

    try {
      const safeName = barber.name
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

      const link = document.createElement("a");
      link.href = qrImageUrl;
      link.download = `foundry-review-${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Failed to download QR code image.");
    }
  };

  // -----------------------------------------------------------
  // Save Google and Yelp review links
  // -----------------------------------------------------------
  const handleSaveReviewLinks = async () => {
    if (!barberId) return;

    const links = {
      google: reviewLinks.google.trim(),
      yelp: reviewLinks.yelp.trim(),
    };

    // Validate URLs, allowing empty fields
    for (const [platform, url] of Object.entries(links)) {
      if (!url) continue;

      try {
        const parsedUrl = new URL(url);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        toast.error(`Please enter a valid ${platform} URL.`);
        return;
      }
    }

    try {
      setSavingLinks(true);
      setError("");

      await updateBarber(barberId, {
        reviewLinks: {
          google: links.google,
          yelp: links.yelp,
        },
      });

      toast.success("Review links saved successfully.");
    } catch (err) {
      setError(err?.message || "Failed to save review links.");
    } finally {
      setSavingLinks(false);
    }
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/75"
        onClick={submitting ? undefined : onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative z-10 w-full max-w-lg border border-white/10 bg-[#141311] shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5 sticky top-0 bg-[#141311] z-10">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              Reviews
            </div>
            <h2 className="mt-1 text-xl font-extrabold uppercase tracking-tight text-[#e8e2d6]">
              Review QR Code
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* Barber info header */}
          <div className="mb-6 flex items-center gap-4">
            {barber.photo?.url ? (
              <img
                src={barber.photo.url}
                alt={barber.name}
                className="w-12 h-12 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#0f0e0d] border border-white/10 flex items-center justify-center text-[#625f58] font-bold text-xl">
                {barber.name?.charAt(0) ?? "?"}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-[#e8e2d6]">{barber.name}</h3>
              {qrMeta && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] mt-1 ${
                    qrMeta.active ? "text-amber-500" : "text-[#625f58]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      qrMeta.active ? "bg-amber-500" : "bg-[#625f58]"
                    }`}
                  />
                  QR {qrMeta.active ? "Active" : "Inactive"}
                </span>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs leading-relaxed text-red-400">
              {error}
            </div>
          )}

          {/* Google & Yelp Review Links */}
          <div className="mb-6 border border-white/10 bg-[#0f0e0d] p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
                Review Platforms
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8f897e]">
                Add the barber's Google and Yelp review links.
                Customers can use these links to leave a review.
              </p>
            </div>

            {/* Google Review URL */}
            <div>
              <label
                htmlFor="googleReviewUrl"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#a89f8f]"
              >
                Google Review URL
              </label>

              <input
                id="googleReviewUrl"
                type="url"
                placeholder="https://g.page/r/..."
                value={reviewLinks.google}
                onChange={(e) =>
                  setReviewLinks((prev) => ({
                    ...prev,
                    google: e.target.value,
                  }))
                }
                disabled={savingLinks}
                className="w-full border border-white/10 bg-black px-3 py-3 text-xs text-[#e8e2d6] outline-none placeholder:text-[#625f58] focus:border-amber-500 disabled:opacity-50"
              />
            </div>

            {/* Yelp Review URL */}
            <div>
              <label
                htmlFor="yelpReviewUrl"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#a89f8f]"
              >
                Yelp Review URL
              </label>

              <input
                id="yelpReviewUrl"
                type="url"
                placeholder="https://www.yelp.com/biz/..."
                value={reviewLinks.yelp}
                onChange={(e) =>
                  setReviewLinks((prev) => ({
                    ...prev,
                    yelp: e.target.value,
                  }))
                }
                disabled={savingLinks}
                className="w-full border border-white/10 bg-black px-3 py-3 text-xs text-[#e8e2d6] outline-none placeholder:text-[#625f58] focus:border-amber-500 disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveReviewLinks}
              disabled={savingLinks || loading}
              className="w-full border border-amber-500 bg-amber-500 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingLinks ? "Saving Links..." : "Save Review Links"}
            </button>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-amber-500" size={22} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8f897e]">
                Loading QR data…
              </span>
            </div>

          /* ====== No QR exists ====== */
          ) : !qrMeta ? (
            <div className="border border-dashed border-white/10 px-6 py-12 text-center">
              <QrCode size={36} className="mx-auto mb-4 text-[#625f58]" />
              <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
                No QR Code Yet
              </div>
              <p className="mt-2 text-xs text-[#8f897e] max-w-xs mx-auto mb-8 leading-relaxed">
                Generate a unique QR code that customers can scan to leave a review
                for {barber.name}.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="border border-amber-500 bg-amber-500 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Generating…" : "Generate Review QR"}
              </button>
            </div>

          /* ====== QR exists ====== */
          ) : (
            <div className="space-y-6">
              {/* QR Image & URL */}
              {qrImageUrl && publicUrl ? (
                <div className="border border-white/10 bg-[#0f0e0d] p-6 flex flex-col items-center">
                  {/* QR on white background for scanning */}
                  <div className="bg-white p-3 rounded-lg mb-5">
                    <img
                      src={qrImageUrl}
                      alt={`Review QR code for ${barber.name}`}
                      className="w-52 h-52"
                    />
                  </div>

                  {/* URL display + copy */}
                  <div className="w-full flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="flex-1 min-w-0 bg-black border border-white/10 text-[11px] text-[#a89f8f] px-3 py-2.5 outline-none font-mono truncate"
                    />
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="flex items-center gap-1.5 shrink-0 border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
                    >
                      <Copy size={13} />
                      Copy
                    </button>
                  </div>

                  {/* Download */}
                  <button
                    type="button"
                    onClick={downloadQR}
                    className="w-full flex justify-center items-center gap-2 border border-amber-500 bg-amber-500 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500"
                  >
                    <Download size={14} />
                    Download QR Image
                  </button>
                </div>
              ) : (
                /* QR record exists but image could not be generated */
                <div className="border border-white/10 bg-[#0f0e0d] px-6 py-10 text-center">
                  <QrCode size={28} className="mx-auto mb-3 text-[#625f58]" />
                  <p className="text-xs leading-relaxed text-[#8f897e] max-w-sm mx-auto">
                    QR image could not be generated. Try refreshing the code below.
                  </p>
                </div>
              )}

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 border border-white/10 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={13} />
                Refresh QR Code
              </button>

              {/* Metadata + status toggle */}
              <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-[11px] text-[#8f897e] space-y-1">
                  {qrMeta.createdAt && (
                    <div>
                      Created:{" "}
                      <span className="text-[#a89f8f]">
                        {new Date(qrMeta.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {qrMeta.regeneratedAt && (
                    <div>
                      Last refreshed:{" "}
                      <span className="text-[#a89f8f]">
                        {new Date(qrMeta.regeneratedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={submitting}
                  className={`shrink-0 border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    qrMeta.active
                      ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                      : "border-amber-500 text-amber-500 hover:bg-amber-500/10"
                  }`}
                >
                  {qrMeta.active ? "Deactivate QR" : "Activate QR"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Refresh confirmation overlay */}
      <AnimatePresence>
        {showRegenConfirm && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowRegenConfirm(false)}
            />
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="relative z-10 w-full max-w-sm border border-white/10 bg-[#1a1816] p-6 shadow-2xl"
            >
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6] mb-3">
                Refresh QR Code?
              </h3>
              <p className="text-xs leading-relaxed text-[#8f897e] mb-6">
                This will refresh the QR code image using the existing permanent
                review URL. Previously printed QR codes will continue to work.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRegenConfirm(false)}
                  disabled={submitting}
                  className="border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-white/30 hover:text-[#e8e2d6] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={submitting}
                  className="border border-amber-500 bg-amber-500 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition-colors hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Refreshing…" : "Yes, Refresh"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BarberReviewQRModal;