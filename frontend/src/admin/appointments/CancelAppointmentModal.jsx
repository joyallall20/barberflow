import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CancelAppointmentModal = ({ appointment, open, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(appointment._id ?? appointment.id, reason);
      setReason("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && appointment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-sm border border-white/10 bg-[#0f0e0d] p-6"
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              Cancel Appointment
            </div>
            <p className="mb-4 text-sm text-[#a89f8f]">
              This will cancel the appointment for{" "}
              <span className="text-[#e8e2d6]">
                {appointment.customer?.name ?? appointment.customerName ?? "this customer"}
              </span>
              . The record is kept with a cancelled status.
            </p>

            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mb-6 w-full border border-white/10 bg-transparent px-3 py-2 text-xs text-[#e8e2d6] outline-none focus:border-amber-500"
              placeholder="Customer requested cancellation…"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8f897e] hover:text-[#e8e2d6]"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="border border-red-400/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-red-400/90 transition-colors hover:bg-red-400/10 disabled:opacity-50"
              >
                {submitting ? "Cancelling…" : "Cancel Appointment"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CancelAppointmentModal;