import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const statusStyles = {
  pending: "text-[#a89f8f]",
  confirmed: "text-amber-500",
  completed: "text-[#8f897e]",
  cancelled: "text-red-400/80",
  no_show: "text-red-400/80",
};

const AppointmentTable = ({
  appointments,
  total,
  page,
  limit,
  loading,
  error,
  onSelect,
  onPageChange,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  if (error) {
    return (
      <div className="mt-6 border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-6 space-y-px border border-white/10 bg-white/5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-[#141311]" />
        ))}
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <div className="mt-6 border border-white/10 px-6 py-16 text-center">
        <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
          No Appointments
        </div>
        <p className="mt-2 text-xs text-[#8f897e]">
          Your schedule is clear for the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="overflow-x-auto border border-white/10">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.2em] text-[#625f58]">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Barber</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt, i) => (
              <motion.tr
                key={appt._id ?? appt.id ?? i}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                onClick={() => onSelect(appt)}
                className="cursor-pointer border-b border-white/10 transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 text-[#e8e2d6]">{appt.date ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-amber-500">
                  {appt.time ?? appt.startTime ?? "—"}
                </td>
                <td className="px-4 py-3 text-[#e8e2d6]">
                  {appt.customer?.name ?? appt.customerName ?? "Unknown"}
                </td>
                <td className="px-4 py-3 text-[#a89f8f]">
                  {appt.service?.name ?? appt.serviceName ?? "—"}
                </td>
                <td className="px-4 py-3 text-[#a89f8f]">
                  {appt.barber?.name ?? appt.barberName ?? "—"}
                </td>
                <td className="px-4 py-3 text-[#e8e2d6]">
                  {appt.price != null ? `$${appt.price}` : "—"}
                </td>
                <td className={`px-4 py-3 font-semibold uppercase tracking-[0.1em] ${statusStyles[appt.status] ?? "text-[#8f897e]"}`}>
                  {appt.status ?? "—"}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#8f897e]">
        <span>
          Page {page} of {totalPages} · {total} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentTable;