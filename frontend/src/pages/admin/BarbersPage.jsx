import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, RefreshCw, MoreVertical, Edit2, Clock, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

import {
  getAdminBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  toggleBarberStatus,
  updateBarberWorkingHours,
} from "../../services/admin.js";

import BarberFormModal from "../../admin/components/BarberFormModal.jsx";
import BarberWorkingHoursModal from "../../admin/components/BarberWorkingHoursModal.jsx";

const EASE = [0.22, 1, 0.36, 1];

const BarbersPage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formTarget, setFormTarget] = useState(null);
  const [hoursTarget, setHoursTarget] = useState(null);

  const fetchBarbers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAdminBarbers({ includeInactive: true });
      const list = data?.data ?? data?.barbers ?? data ?? [];
      setBarbers(list);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something prevented the barbers list from loading."
      );
      toast.error("Failed to load barbers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  const handleSubmit = async (values, id) => {
    const label = id ? "Barber updated" : "Barber created";

    try {
      let result;
      if (id) {
        result = await updateBarber(id, values);
      } else {
        result = await createBarber(values);
      }

      toast.success(label);
      await fetchBarbers();
      return result;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        `Failed to ${id ? "update" : "create"} barber.`;

      toast.error(message);
      throw err;
    }
  };

  const handleUpdateHours = async (workingHours, id) => {
    try {
      await updateBarberWorkingHours(id, workingHours);
      toast.success("Working hours updated");
      await fetchBarbers();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to update working hours."
      );
      throw err;
    }
  };

  const handleToggleStatus = async (barber) => {
    const id = barber._id ?? barber.id;

    try {
      await toggleBarberStatus(id);
      toast.success(
        barber.active ? "Barber deactivated" : "Barber activated"
      );
      await fetchBarbers();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to update status."
      );
    }
  };

  const handleDelete = async (barber) => {
    if (!window.confirm(`Permanently delete ${barber.name}? This cannot be undone.`)) return;
    
    const id = barber._id ?? barber.id;

    try {
      await deleteBarber(id);
      toast.success("Barber deleted");
      await fetchBarbers();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to delete barber. They may have upcoming appointments."
      );
    }
  };

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
            Barbers
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#a89f8f]">
            Manage your team, their working hours, and specialties.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchBarbers}
            disabled={loading}
            className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setFormTarget({})}
            className="flex items-center gap-2 border border-amber-500 bg-amber-500 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition-all hover:bg-transparent hover:text-amber-500"
          >
            <Plus size={13} />
            New Barber
          </button>
        </div>
      </motion.div>

      <div className="mt-8">
        {error ? (
          <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-px border border-white/10 bg-white/5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-[#141311]" />
            ))}
          </div>
        ) : !barbers.length ? (
          <div className="border border-white/10 px-6 py-16 text-center">
            <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
              No Barbers
            </div>
            <p className="mt-2 text-xs text-[#8f897e]">
              Add a barber to start accepting appointments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.2em] text-[#625f58]">
                  <th className="px-4 py-3 font-semibold w-16">Photo</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Specialties</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {barbers.map((barber, i) => (
                  <motion.tr
                    key={barber._id ?? barber.id ?? i}
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="border-b border-white/10 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      {barber.photo?.url ? (
                        <img 
                          src={barber.photo.url} 
                          alt={barber.name} 
                          className="w-10 h-10 rounded-full object-cover border border-white/10" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0f0e0d] border border-white/10 flex items-center justify-center text-[#625f58] font-bold text-lg">
                          {barber.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#e8e2d6]">
                      {barber.name}
                    </td>
                    <td className="px-4 py-3 text-[#a89f8f]">
                      {barber.email}
                    </td>
                    <td className="px-4 py-3 text-[#a89f8f]">
                      {barber.specialties?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {barber.specialties.map(spec => (
                            <span key={spec} className="inline-block bg-[#0f0e0d] px-2 py-1 text-[9px] uppercase tracking-wider text-amber-500/80 rounded border border-white/5">
                              {spec}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] ${barber.active ? "text-amber-500" : "text-[#625f58]"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${barber.active ? "bg-amber-500" : "bg-[#625f58]"}`} />
                        {barber.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setFormTarget(barber)}
                          className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-amber-500"
                          title="Edit Barber"
                        >
                          <Edit2 size={14} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setHoursTarget(barber)}
                          className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-amber-500"
                          title="Working Hours"
                        >
                          <Clock size={14} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(barber)}
                          className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-amber-500"
                          title={barber.active ? "Deactivate" : "Activate"}
                        >
                          <Power size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(barber)}
                          className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-red-400"
                          title="Delete Barber"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget !== null && (
        <BarberFormModal
          barber={formTarget?._id || formTarget?.id ? formTarget : null}
          onClose={() => setFormTarget(null)}
          onSubmit={handleSubmit}
        />
      )}

      {hoursTarget !== null && (
        <BarberWorkingHoursModal
          barber={hoursTarget}
          onClose={() => setHoursTarget(null)}
          onSubmit={handleUpdateHours}
        />
      )}
    </div>
  );
};

export default BarbersPage;
