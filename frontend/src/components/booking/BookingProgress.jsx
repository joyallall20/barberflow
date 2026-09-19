import { motion, useReducedMotion } from "framer-motion";

const STEPS = [
  { n: "01", label: "Date", full: "Date" },
  { n: "02", label: "Service + Barber", short: "Service" },
  { n: "03", label: "Time", full: "Time" },
  { n: "04", label: "Details", full: "Details" },
];

const BookingProgress = ({ currentStep = 1 }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <nav aria-label="Booking progress" className="w-full">
      {/* Thin rule above the labels */}
      <div className="relative mb-4 h-px w-full bg-white/10">
        {/* Amber fill from step 1 to current */}
        <motion.div
          className="absolute left-0 top-0 h-px bg-amber-500"
          initial={false}
          animate={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>

      {/* Labels */}
      <ol className="grid grid-cols-4 gap-3 md:gap-6">
        {STEPS.map((s, i) => {
          const index = i + 1;
          const isActive = index === currentStep;
          const isDone = index < currentStep;

          return (
            <li key={s.n} className="min-w-0">
              <div
                className={`flex items-baseline gap-2 transition-colors duration-300 ${
                  isActive
                    ? "text-amber-500"
                    : isDone
                    ? "text-[#e8e2d6]"
                    : "text-[#8f897e]"
                }`}
              >
                {/* Step number */}
                <span className="text-[10px] font-bold tracking-[0.2em] md:text-xs">
                  {s.n}
                </span>

                {/* Divider */}
                <span
                  aria-hidden
                  className={`hidden h-px w-4 sm:inline-block ${
                    isActive
                      ? "bg-amber-500"
                      : isDone
                      ? "bg-[#e8e2d6]/40"
                      : "bg-white/15"
                  }`}
                />

                {/* Label — full on md+, short/compressed on mobile */}
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] md:text-xs">
                  <span className="hidden md:inline">{s.label}</span>
                  <span className="md:hidden">{s.short || s.label}</span>
                </span>

                {/* Completed dot */}
                {isDone && (
                  <span
                    aria-hidden
                    className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-amber-500 md:block"
                  />
                )}
              </div>

              {/* Active underline (small, under the number) */}
              <div className="mt-2 h-px w-full">
                {isActive && (
                  <motion.div
                    layoutId="booking-progress-active"
                    className="h-px w-full bg-amber-500"
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default BookingProgress;