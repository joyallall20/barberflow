import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import AppointmentStatusActions from "./AppointmentStatusActions";

const EASE = [0.22, 1, 0.36, 1];

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-white/10 py-3">
    <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
      {label}
    </span>
    <span className="text-xs font-semibold text-[#e8e2d6]">{value ?? "—"}</span>
  </div>
);

const AppointmentDrawer = ({
  appointment,
  open,
  onClose,
  onConfirm,
  onComplete,
  onNoShow,
  onCancelRequest,
  onRescheduleRequest,
  onDeleteRequest,
  onSaveNotes,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(appointment?.notes ?? "");
  }, [appointment]);

  if (!appointment) return null;

  const id = appointment._id ?? appointment.id;
  const notesChanged = notes !== (appointment.notes ?? "");

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(id, notes);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close appointment details"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />

          <motion.aside
            initial={prefersReducedMotion ? false : { x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#0f0e0d] sm:max-w-md"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                Appointment
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <h2 className="mb-4 text-xl font-extrabold uppercase tracking-tight text-[#e8e2d6]">
                {appointment.customer?.name ?? appointment.customerName ?? "Unknown customer"}
              </h2>

              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
                Customer
              </div>
              <Row label="Email" value={appointment.customer?.email ?? appointment.email} />
              <Row label="Phone" value={appointment.customer?.phone ?? appointment.phone} />

              <div className="mb-2 mt-6 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
                Appointment
              </div>
              <Row label="Date" value={appointment.date} />
              <Row label="Start" value={appointment.time ?? appointment.startTime} />
              <Row label="End" value={appointment.endTime} />
              <Row label="Service" value={appointment.service?.name ?? appointment.serviceName} />
              <Row label="Barber" value={appointment.barber?.name ?? appointment.barberName} />
              <Row label="Price" value={appointment.price != null ? `$${appointment.price}` : undefined} />
              <Row label="Status" value={appointment.status} />

              <div className="mt-6">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
                  Notes
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-white/10 bg-transparent px-3 py-2 text-xs text-[#e8e2d6] outline-none transition-colors focus:border-amber-500"
                  placeholder="No notes yet…"
                />
                {notesChanged && (
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="mt-2 border border-white/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
                  >
                    {savingNotes ? "Saving…" : "Save Notes"}
                  </button>
                )}
              </div>

              <div className="mt-6">
                <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
                  Actions
                </div>
                <AppointmentStatusActions
                  status={appointment.status}
                  onConfirm={() => onConfirm(id)}
                  onComplete={() => onComplete(id)}
                  onNoShow={() => onNoShow(id)}
                  onRescheduleRequest={() => onRescheduleRequest(appointment)}
                  onCancelRequest={() => onCancelRequest(appointment)}
                />
              </div>
            </div>

            <div className="border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => onDeleteRequest(appointment)}
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400/70 transition-colors hover:text-red-400"
              >
                <Trash2 size={13} />
                Delete Appointment
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AppointmentDrawer;