import { motion, useReducedMotion } from "framer-motion";

// NOTE: the brief only confirms aggregate weekly fields (total, completed,
// cancelled, noShow, upcoming, revenue, expectedRevenue) — not a per-day
// breakdown. This renders a per-day bar chart IF data.days (or .byDay)
// exists, and falls back to an aggregate status breakdown otherwise.
// Confirm the real shape and I'll simplify this once known.

const STATUS_META = [
  { key: "completed", label: "Completed", color: "bg-amber-500" },
  { key: "upcoming", label: "Upcoming", color: "bg-[#e8e2d6]/70" },
  { key: "cancelled", label: "Cancelled", color: "bg-red-400/60" },
  { key: "noShow", label: "No-show", color: "bg-red-700/50" },
];

const WeeklyBookings = ({ data, loading, error }) => {
  const prefersReducedMotion = useReducedMotion();

  if (error) {
    return (
      <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        Failed to load weekly activity
      </div>
    );
  }

  if (loading) {
    return <div className="h-40 animate-pulse border border-white/10 bg-[#141311]" />;
  }

  const dayBreakdown = data?.days ?? data?.byDay;

  if (Array.isArray(dayBreakdown) && dayBreakdown.length) {
    const max = Math.max(...dayBreakdown.map((d) => d.total ?? d.count ?? 0), 1);
    return (
      <div className="flex items-end gap-2 border border-white/10 p-6" style={{ height: 200 }}>
        {dayBreakdown.map((d, i) => {
          const value = d.total ?? d.count ?? 0;
          const heightPct = Math.max((value / max) * 100, 4);
          return (
            <div key={d.date ?? i} className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                initial={prefersReducedMotion ? false : { height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="w-full bg-amber-500/80"
                style={{ minHeight: 2 }}
              />
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#8f897e]">
                {d.label ?? d.date?.slice(-2) ?? "—"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: aggregate status breakdown for the week
  const total = data?.total ?? 0;

  return (
    <div className="border border-white/10 p-6">
      <div className="mb-6 flex items-baseline gap-3">
        <span className="text-3xl font-extrabold text-[#e8e2d6]">{total}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8f897e]">
          bookings this week
        </span>
      </div>

      <div className="space-y-3">
        {STATUS_META.map(({ key, label, color }) => {
          const value = data?.[key] ?? 0;
          const pct = total ? Math.round((value / total) * 100) : 0;
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.15em] text-[#8f897e]">
                <span>{label}</span>
                <span className="text-[#e8e2d6]">{value}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5">
                <motion.div
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6 }}
                  className={`h-full ${color}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyBookings;