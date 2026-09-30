import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Check, X, Trash2, MessageSquare, Filter } from "lucide-react";
import { toast } from "sonner";

import {
  getAdminReviews,
  approveReview,
  rejectReview,
  deleteReview,
} from "../../services/admin.js";

const EASE = [0.22, 1, 0.36, 1];

const AdminReviewsPage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = { page, limit };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const data = await getAdminReviews(params);
      setReviews(data?.data?.reviews ?? data?.reviews ?? []);
      setTotal(data?.data?.total ?? data?.total ?? 0);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something prevented the reviews list from loading."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id) => {
    try {
      await approveReview(id);
      toast.success("Review approved.");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve review.");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this review?")) return;
    try {
      await rejectReview(id);
      toast.success("Review rejected.");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject review.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      await deleteReview(id);
      toast.success("Review deleted.");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete review.");
    }
  };

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Business
          </div>

          <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
            Customer Reviews
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#a89f8f]">
            Review customer feedback, moderate submissions, and manage published reviews.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </motion.div>

      <div className="mt-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
            <Filter size={14} />
            Filter by Status:
          </div>
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                  statusFilter === s
                    ? "border-amber-500 bg-amber-500/10 text-amber-500"
                    : "border-white/10 text-[#8f897e] hover:border-amber-500 hover:text-amber-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-px border border-white/10 bg-white/5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-[#141311]" />
            ))}
          </div>
        ) : !reviews.length ? (
          <div className="border border-white/10 px-6 py-16 text-center">
            <MessageSquare className="mx-auto mb-4 text-[#625f58]" size={32} />
            <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
              No Reviews Found
            </div>
            <p className="mt-2 text-xs text-[#8f897e]">
              No reviews match your current filters.
            </p>
          </div>
        ) : (
          <div>
            <div className="space-y-4">
              {reviews.map((review, i) => (
                <motion.div
                  key={review._id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`flex flex-col gap-4 border border-white/10 bg-[#0f0e0d] p-6 lg:flex-row lg:items-start lg:justify-between ${
                    review.status === "pending" ? "border-l-4 border-l-amber-500" : ""
                  }`}
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-block border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
                          review.status === "approved"
                            ? "border-green-500/30 text-green-400"
                            : review.status === "rejected"
                            ? "border-red-500/30 text-red-400"
                            : "border-amber-500/30 text-amber-500 bg-amber-500/10"
                        }`}
                      >
                        {review.status}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f897e]">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#625f58]">
                        Source: {review.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, idx) => (
                        <span key={idx} className={idx < review.rating ? "text-amber-500" : "text-[#625f58]"}>
                          ★
                        </span>
                      ))}
                    </div>

                    <p className="text-sm leading-relaxed text-[#e8e2d6]">
                      {review.comment || <span className="text-[#625f58] italic">No comment provided.</span>}
                    </p>

                    <div className="text-[11px] text-[#a89f8f]">
                      <span className="font-semibold text-[#e8e2d6]">{review.customer?.name || "Unknown Customer"}</span> reviewed{" "}
                      <span className="font-semibold text-[#e8e2d6]">{review.barber?.name || "Unknown Barber"}</span>
                      {review.appointment?.date && (
                        <span> for visit on {new Date(review.appointment.date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 lg:border-t-0 lg:pt-0">
                    {review.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(review._id)}
                          className="flex items-center gap-2 border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-green-400 transition-colors hover:bg-green-500/20"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(review._id)}
                          className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400 transition-colors hover:bg-red-500/20"
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(review._id)}
                      className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#625f58] transition-colors hover:border-red-500 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#8f897e]">
              <span>
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex px-4 py-2 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex px-4 py-2 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviewsPage;
