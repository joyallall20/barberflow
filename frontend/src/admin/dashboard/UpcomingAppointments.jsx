import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const UpcomingAppointments = ({ data, loading, error }) => {
  const prefersReducedMotion = useReducedMotion();
  const appointments = data?.appointments ?? data?.items ?? [];

  if (error) {
    return (
      <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        Failed to load upcoming appointments
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div className="space-y-px border border-white/10 bg-white/5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-[#141311]" />
          ))}
        </div>
      ) : appointments.length ? (
        <div className="border-t border-white/10">
          {appointments.map((appt, index) => (
            <motion.div
              key={appt._id ?? appt.id ?? index}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="flex flex-col gap-1 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="text-sm font-semibold text-[#e8e2d6]">
                {appt.customer?.name ?? appt.customerName ?? "Unknown"}
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.15em] text-[#8f897e]">
                <span>{appt.service?.name ?? appt.serviceName ?? "—"}</span>
                <span>{appt.barber?.name ?? appt.barberName ?? "—"}</span>
                <span>{appt.date ?? "—"}</span>
                <span className="text-amber-500">{appt.time ?? "—"}</span>
                <span>{appt.status ?? "—"}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="border border-white/10 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
          Nothing upcoming
        </div>
      )}

      <Link
        to="/admin/appointments"
        className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:text-amber-500"
      >
        View all appointments
        <ArrowRight size={12} />
      </Link>
    </div>
  );
};

export default UpcomingAppointments;