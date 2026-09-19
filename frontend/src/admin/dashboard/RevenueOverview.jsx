import { motion, useReducedMotion } from "framer-motion";

// NOTE: shape of the groupBy response is unconfirmed. Handles both a
// single aggregate object ({ completed, expected, count }) and an array
// of periods ([{ period, completed, expected, count }, ...]).

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toLocaleString("en-US")}`;
};

const RevenueOverview = ({ data, loading, error }) => {
  const prefersReducedMotion = useReducedMotion();

  if (error) {
    return (
      <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        Failed to load revenue overview
      </div>
    );
  }

  if (loading) {
    return <div className="h-32 animate-pulse border border-white/10 bg-[#141311]" />;
  }

  const periods = Array.isArray(data) ? data : data?.periods;

  if (Array.isArray(periods) && periods.length) {
    return (
      <div className="border-t border-white/10">
        {periods.map((p, i) => (
          <motion.div
            key={p.period ?? p.label ?? i}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#e8e2d6]">
              {p.period ?? p.label ?? `Period ${i + 1}`}
            </span>
            <div className="flex gap-6 text-[10px] uppercase tracking-[0.15em] text-[#8f897e]">
              <span>
                Completed{" "}
                <span className="text-amber-500">
                  {formatCurrency(p.completed ?? p.revenue)}
                </span>
              </span>
              <span>
                Expected{" "}
                <span className="text-[#e8e2d6]">
                  {formatCurrency(p.expected ?? p.expectedRevenue)}
                </span>
              </span>
              <span>
                Bookings <span className="text-[#e8e2d6]">{p.count ?? "—"}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Fallback: single aggregate object
  return (
    <div className="grid grid-cols-1 gap-px border border-white/10 bg-white/5 sm:grid-cols-3">
      {[
        { label: "Completed Revenue", value: formatCurrency(data?.completed ?? data?.revenue) },
        { label: "Expected Revenue", value: formatCurrency(data?.expected ?? data?.expectedRevenue) },
        { label: "Bookings", value: data?.count ?? "—" },
      ].map(({ label, value }) => (
        <div key={label} className="bg-[#141311] p-6">
          <div className="text-2xl font-extrabold tracking-tight text-[#e8e2d6]">
            {value}
          </div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8f897e]">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RevenueOverview;