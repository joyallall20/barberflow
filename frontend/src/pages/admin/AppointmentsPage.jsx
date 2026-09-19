import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  getAdminAppointments,
  getAdminBarbers,
  confirmAdminAppointment,
  completeAdminAppointment,
  markAdminAppointmentNoShow,
  cancelAdminAppointment,
  rescheduleAdminAppointment,
  deleteAdminAppointment,
  updateAdminAppointment,
} from "../../services/admin.js";

import AppointmentFilters from "../../admin/appointments/AppointmentFilters";
import AppointmentTable from "../../admin/appointments/AppointmentTable";
import AppointmentDrawer from "../../admin/appointments/AppointmentDrawer";
import CancelAppointmentModal from "../../admin/appointments/CancelAppointmentModal";
import RescheduleAppointmentModal from "../../admin/appointments/RescheduleAppointmentModal";

const EASE = [0.22, 1, 0.36, 1];

const DEFAULT_FILTERS = {
  from: "",
  to: "",
  barber: "",
  status: "",
  page: 1,
  limit: 20,
};

const AppointmentsPage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [list, setList] = useState({ appointments: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [barbers, setBarbers] = useState([]);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v !== null)
      );
    const response = await getAdminAppointments(params);

const payload = response?.data ?? response;

setList({
  appointments: payload?.appointments ?? [],
  total: payload?.total ?? 0,
});
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load appointments.");
      toast.error("Couldn't load appointments.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    getAdminBarbers()
      .then((data) => setBarbers(data?.barbers ?? data ?? []))
      .catch(() => {
        // Filter dropdown just stays empty if this fails — not critical.
      });
  }, []);

  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  };

  const changePage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const runAction = async (label, fn) => {
    try {
      const result = await fn();
      toast.success(label);
      await fetchList();
      return result;
    } catch (err) {
      const message = err?.response?.data?.message || `Failed to ${label.toLowerCase()}.`;
      toast.error(message);
      throw err;
    }
  };

  const handleConfirm = (id) => runAction("Appointment confirmed", () => confirmAdminAppointment(id));
  const handleComplete = (id) => runAction("Appointment marked complete", () => completeAdminAppointment(id));
  const handleNoShow = (id) => runAction("Marked as no-show", () => markAdminAppointmentNoShow(id));

  const handleCancelConfirmed = async (id, cancellationReason) => {
    await runAction("Appointment cancelled", () => cancelAdminAppointment(id, { cancellationReason }));
    setCancelTarget(null);
    setSelectedAppointment(null);
  };

  const handleRescheduleConfirmed = async (id, data) => {
    const result = await runAction("Appointment rescheduled", () => rescheduleAdminAppointment(id, data));
    setRescheduleTarget(null);
    setSelectedAppointment(null);
    return result;
  };

  const handleDelete = async (appointment) => {
    if (!window.confirm("Permanently delete this appointment? This cannot be undone.")) return;
    await runAction("Appointment deleted", () =>
      deleteAdminAppointment(appointment._id ?? appointment.id)
    );
    setSelectedAppointment(null);
  };

  const handleSaveNotes = (id, notes) =>
    runAction("Notes updated", () => updateAdminAppointment(id, { notes }));

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
            Appointments
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchList}
          disabled={loading}
          className="flex items-center gap-2 self-start border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </motion.div>

      <AppointmentFilters
        filters={filters}
        onChange={updateFilters}
        barbers={barbers}
        loading={loading}
      />

      <AppointmentTable
        appointments={list.appointments}
        total={list.total}
        page={filters.page}
        limit={filters.limit}
        loading={loading}
        error={error}
        onSelect={setSelectedAppointment}
        onPageChange={changePage}
      />

      <AppointmentDrawer
        appointment={selectedAppointment}
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        onConfirm={handleConfirm}
        onComplete={handleComplete}
        onNoShow={handleNoShow}
        onCancelRequest={setCancelTarget}
        onRescheduleRequest={setRescheduleTarget}
        onDeleteRequest={handleDelete}
        onSaveNotes={handleSaveNotes}
      />

      <CancelAppointmentModal
        appointment={cancelTarget}
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirmed}
      />

      <RescheduleAppointmentModal
        appointment={rescheduleTarget}
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleRescheduleConfirmed}
      />
    </div>
  );
};

export default AppointmentsPage;