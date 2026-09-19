import { useRef, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
  animate,
} from "framer-motion";
import { Users, Scissors, Star, Award } from "lucide-react";

const CountUp = ({ to, suffix = "", prefix = "", decimals = 0, duration = 1.8 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      setDisplay(to.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }));
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        setDisplay(
          v.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        );
      },
    });
    return () => controls.stop();
  }, [inView, to, decimals, duration, prefersReducedMotion]);

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
};

const Trust = () => {
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const wordmarkY = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);
  const headingY = useTransform(scrollYProgress, [0, 1], [-18, 18]);

  const stats = [
    { to: 5000, suffix: "+", label: "Clients Served", icon: Users, format: true },
    { to: 15, suffix: "+", label: "Years of Craft", icon: Scissors },
    { to: 4.9, suffix: "", label: "Average Rating", icon: Star, decimals: 1 },
    { to: 3, suffix: "", label: "Master Barbers", icon: Award },
  ];

  return (
    <section
      id="trust"
      ref={sectionRef}
      className="relative overflow-hidden border-y border-white/10 bg-[#141311] text-[#e8e2d6]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

      <motion.div
        aria-hidden="true"
        style={prefersReducedMotion ? undefined : { y: wordmarkY }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      >
        <span className="whitespace-nowrap text-[18vw] font-extrabold uppercase leading-none tracking-tight text-white/[0.03] md:text-[14vw]">
          The Foundry
        </span>
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-24 lg:px-16">
        <motion.div
          style={prefersReducedMotion ? undefined : { y: headingY }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              <span className="h-px w-8 bg-amber-500" />
              The Foundry
            </div>

            <h2 className="max-w-xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">
              Built on craft.
              <br />
              <span className="text-[#a89f8f]">Trusted over time.</span>
            </h2>
          </div>

          <p className="max-w-sm text-sm leading-relaxed text-[#a89f8f] md:text-right">
            Good work earns a reputation. Ours has been built one chair,
            one cut, and one customer at a time.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 border-l border-t border-white/10 md:grid-cols-4">
          {stats.map(({ to, suffix, decimals, label, icon: Icon }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden border-b border-r border-white/10 p-6 md:p-8 lg:p-10"
            >
              {/* Hover sweep line */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px -translate-x-full bg-gradient-to-r from-transparent via-amber-500 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {/* Hover glow */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/0 to-amber-500/[0.06] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <Icon
                size={20}
                strokeWidth={1.5}
                className="relative mb-10 text-amber-500 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
              />

              <motion.div
                initial={{ scale: 0.85, filter: "blur(6px)" }}
                whileInView={{ scale: 1, filter: "blur(0px)" }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.1 + 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative text-4xl font-extrabold tracking-tight text-[#e8e2d6] transition-colors duration-300 group-hover:text-amber-500 md:text-5xl"
              >
                <CountUp to={to} suffix={suffix} decimals={decimals} />
              </motion.div>

              <div className="relative mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a89f8f]">
                {label}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-10 flex items-center gap-4"
        >
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#a89f8f]">
            South Austin · Texas
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </motion.div>
      </div>
    </section>
  );
};

export default Trust;