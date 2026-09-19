import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const inputClass =
  "w-full border border-white/10 bg-transparent px-3 py-2 text-xs text-[#e8e2d6] outline-none transition-colors focus:border-amber-500";

const RescheduleAppointmentModal = ({ appointment, open, onClose, onConfirm }) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    if (!date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(appointment._id ?? appointment.id, { date, time });
      setDate("");
      setTime("");
    } catch (err) {
      // Backend validates availability — surface its message directly,
      // don't compute conflicts locally.
      setError(err?.response?.data?.message || "Could not reschedule — that time may not be available.");
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
              Reschedule Appointment
            </div>
            <p className="mb-4 text-sm text-[#a89f8f]">
              Currently{" "}
              <span className="text-[#e8e2d6]">
                {appointment.date} at {appointment.time ?? appointment.startTime}
              </span>
              .
            </p>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
                  New Date
                </label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
                  New Time
                </label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-[11px] text-red-400/90">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8f897e] hover:text-[#e8e2d6]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || !date || !time}
                className="border border-amber-500 bg-amber-500 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition-all hover:bg-transparent hover:text-amber-500 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Confirm New Time"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RescheduleAppointmentModal;