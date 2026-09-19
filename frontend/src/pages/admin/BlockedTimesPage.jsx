import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, RefreshCw, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  getBlockedTimes,
  createBlockedTime,
  updateBlockedTime,
  deleteBlockedTime,
  getRecurringBlockedTimes,
  createRecurringBlockedTime,
  updateRecurringBlockedTime,
  deleteRecurringBlockedTime,
  getAdminBarbers,
} from "../../services/admin.js";

import BlockedTimeFormModal from "../../admin/components/BlockedTimeFormModal.jsx";

const EASE = [0.22, 1, 0.36, 1];

const BlockedTimesPage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [blockedTimes, setBlockedTimes] = useState([]);
  const [recurringBlockedTimes, setRecurringBlockedTimes] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formTarget, setFormTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [blockedData, recurringData, barbersData] = await Promise.all([
        getBlockedTimes(),
        getRecurringBlockedTimes(),
        getAdminBarbers({ includeInactive: true })
      ]);
      
      const blocksList = blockedData?.data ?? blockedData ?? [];
      setBlockedTimes(Array.isArray(blocksList) ? blocksList : blocksList.blockedTimes || []);
      
      const recurringList = recurringData?.data ?? recurringData ?? [];
      setRecurringBlockedTimes(Array.isArray(recurringList) ? recurringList : recurringList.recurringBlockedTimes || []);

      const barbersList = barbersData?.data ?? barbersData?.barbers ?? barbersData ?? [];
      setBarbers(Array.isArray(barbersList) ? barbersList : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something prevented the blocked times from loading."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (values, id, type) => {
    const label = id ? "Blocked time updated" : "Blocked time created";

    try {
      if (type === "recurring") {
        if (id) {
          await updateRecurringBlockedTime(id, values);
        } else {
          await createRecurringBlockedTime(values);
        }
      } else {
        if (id) {
          await updateBlockedTime(id, values);
        } else {
          await createBlockedTime(values);
        }
      }

      toast.success(label);
      setFormTarget(null);
      await fetchData();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        `Failed to ${id ? "update" : "create"} blocked time.`;

      toast.error(message);
      throw err;
    }
  };

  const handleDelete = async (item, isRecurring = false) => {
    if (!window.confirm("Permanently delete this blocked time?")) return;

    const id = item._id ?? item.id;
    try {
      if (isRecurring) {
        await deleteRecurringBlockedTime(id);
      } else {
        await deleteBlockedTime(id);
      }
      toast.success("Blocked time deleted");
      await fetchData();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete blocked time."
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
            Blocked Times
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#a89f8f]">
            Manage time blocks when barbers are unavailable.
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

          <button
            type="button"
            onClick={() => setFormTarget({})}
            className="flex items-center gap-2 border border-amber-500 bg-amber-500 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition-all hover:bg-transparent hover:text-amber-500"
          >
            <Plus size={13} />
            New Block
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
        ) : !blockedTimes.length && !recurringBlockedTimes.length ? (
          <div className="border border-white/10 px-6 py-16 text-center">
            <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
              No Blocked Times
            </div>
            <p className="mt-2 text-xs text-[#8f897e]">
              Schedule blocks to prevent bookings during certain hours.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {recurringBlockedTimes.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#e8e2d6]">
                  Recurring Blocks
                </h2>
                <div className="overflow-x-auto border border-white/10">
                  <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.2em] text-[#625f58]">
                        <th className="px-4 py-3 font-semibold">Scope/Barber</th>
                        <th className="px-4 py-3 font-semibold">Days</th>
                        <th className="px-4 py-3 font-semibold">Time</th>
                        <th className="px-4 py-3 font-semibold">Reason</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recurringBlockedTimes.map((item, i) => {
                        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                        const daysStr = item.daysOfWeek?.map((d) => dayNames[d]).join(" · ") || "—";
                        const isAllBarbers = item.scope === "all_barbers";
                        
                        return (
                          <motion.tr
                            key={`rec-${item._id ?? item.id ?? i}`}
                            initial={prefersReducedMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            className="border-b border-white/10 transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-3 font-semibold text-[#e8e2d6]">
                              {isAllBarbers ? "All Barbers" : item.barber?.name || "Unknown"}
                            </td>
                            <td className="px-4 py-3 text-[#a89f8f]">
                              {daysStr}
                            </td>
                            <td className="px-4 py-3 text-amber-500 font-semibold">
                              {item.startTime} - {item.endTime}
                            </td>
                            <td className="px-4 py-3 text-[#a89f8f]">
                              {item.reason || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] ${item.active ? "text-amber-500" : "text-[#625f58]"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-amber-500" : "bg-[#625f58]"}`} />
                                {item.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFormTarget({ ...item, isRecurring: true })}
                                  className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-amber-500"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item, true)}
                                  className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {blockedTimes.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#e8e2d6]">
                  One-time Blocks
                </h2>
                <div className="overflow-x-auto border border-white/10">
                  <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.2em] text-[#625f58]">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Barber</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedTimes.map((item, i) => {
                  let dateStr = "—";
                  if (item.date) {
                    dateStr = new Date(item.date).toLocaleDateString();
                  }

                  return (
                    <motion.tr
                      key={item._id ?? item.id ?? i}
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="border-b border-white/10 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 font-semibold text-[#e8e2d6]">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 text-amber-500 font-semibold">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="px-4 py-3 text-[#a89f8f]">
                        {item.barber?.name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-[#a89f8f]">
                        {item.reason || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] ${item.active ? "text-amber-500" : "text-[#625f58]"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-amber-500" : "bg-[#625f58]"}`} />
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setFormTarget(item)}
                            className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-amber-500"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="flex h-8 w-8 items-center justify-center text-[#8f897e] transition-colors hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    )}
  </div>

  {formTarget !== null && (
        <BlockedTimeFormModal
          blockedTime={formTarget?._id || formTarget?.id ? formTarget : null}
          barbers={barbers}
          onClose={() => setFormTarget(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default BlockedTimesPage;
