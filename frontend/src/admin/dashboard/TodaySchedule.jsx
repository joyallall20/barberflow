import { motion, useReducedMotion } from "framer-motion";

const statusStyles = {
  completed: "text-[#8f897e]",
  confirmed: "text-amber-500",
  pending: "text-[#a89f8f]",
  cancelled: "text-red-400/80",
  "no-show": "text-red-400/80",
};

const TodaySchedule = ({ data, loading, error, onSelect }) => {
  const prefersReducedMotion = useReducedMotion();
  const appointments = data?.appointments ?? data?.items ?? [];

  if (error) {
    return (
      <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        Failed to load today&apos;s schedule
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-px border border-white/10 bg-white/5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse bg-[#141311]" />
        ))}
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <div className="border border-white/10 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        No appointments booked today
      </div>
    );
  }

  return (
    <div className="border-t border-white/10">
      {appointments.map((appt, index) => (
        <motion.button
          key={appt._id ?? appt.id ?? index}
          type="button"
          onClick={() => onSelect?.(appt)}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.04 }}
          className="flex w-full flex-col gap-1 border-b border-white/10 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="flex items-baseline gap-4">
            <span className="w-16 flex-shrink-0 text-xs font-bold text-amber-500">
              {appt.time ?? "—"}
            </span>
            <span className="text-sm font-semibold text-[#e8e2d6]">
              {appt.customer?.name ?? appt.customerName ?? "Unknown"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-20 text-[10px] uppercase tracking-[0.15em] text-[#8f897e] sm:pl-0">
            <span>{appt.service?.name ?? appt.serviceName ?? "—"}</span>
            <span>{appt.barber?.name ?? appt.barberName ?? "—"}</span>
            <span className="text-[#e8e2d6]">
              {appt.price != null ? `$${appt.price}` : "—"}
            </span>
            <span className={statusStyles[appt.status] ?? "text-[#8f897e]"}>
              {appt.status ?? "—"}
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default TodaySchedule;