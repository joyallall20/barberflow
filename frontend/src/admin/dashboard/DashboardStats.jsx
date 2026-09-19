import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, DollarSign, Clock, Users, Scissors, UserCog } from "lucide-react";

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatCount = (value) => {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-US");
};

const DashboardStats = ({ data, loading, error }) => {
  const prefersReducedMotion = useReducedMotion();

  const stats = [
    {
      label: "Today's Appointments",
      value: formatCount(data?.today?.appointments ?? data?.today?.count),
      icon: CalendarCheck,
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(data?.today?.revenue),
      icon: DollarSign,
    },
    {
      label: "Upcoming Appointments",
      value: formatCount(data?.week?.upcoming ?? data?.statusCounts?.upcoming),
      icon: Clock,
    },
    {
      label: "Customers",
      value: formatCount(data?.allTime?.customers ?? data?.inventory?.customers),
      icon: Users,
    },
    {
      label: "Active Barbers",
      value: formatCount(data?.inventory?.activeBarbers ?? data?.inventory?.barbers),
      icon: UserCog,
    },
    {
      label: "Active Services",
      value: formatCount(data?.inventory?.activeServices ?? data?.inventory?.services),
      icon: Scissors,
    },
  ];

  if (error) {
    return (
      <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        Failed to load key statistics
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/5 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map(({ label, value, icon: Icon }, index) => (
        <motion.div
          key={label}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.06 }}
          className="bg-[#141311] p-5"
        >
          <Icon size={16} className="mb-6 text-amber-500" />
          <div className="text-2xl font-extrabold tracking-tight text-[#e8e2d6]">
            {loading ? (
              <span className="inline-block h-6 w-12 animate-pulse bg-white/10" />
            ) : (
              value
            )}
          </div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8f897e]">
            {label}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardStats;