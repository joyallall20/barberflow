import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { barbers } from "./shop.js";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141311]";

const Barbers = () => {
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  const current = barbers[active];

  const next = () => setActive((prev) => (prev + 1) % barbers.length);
  const previous = () =>
    setActive((prev) => (prev - 1 + barbers.length) % barbers.length);

  return (
    <section
      id="barbers"
      ref={sectionRef}
      className="relative scroll-mt-20 overflow-hidden bg-[#141311] text-[#e8e2d6] md:min-h-[calc(100dvh-80px)]"
    >
      {/* Subtle background wordmark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="whitespace-nowrap text-[16vw] font-black uppercase leading-none text-white/[0.025]">
          Foundry
        </span>
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 py-10 md:min-h-[calc(100dvh-80px)] md:px-12 md:py-7 lg:px-16">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-4 md:mb-5"
        >
          <div className="mb-1.5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            <span className="h-px w-8 bg-amber-500" />
            The Craftsmen
          </div>

          <h2 className="text-2xl font-extrabold uppercase leading-[0.9] tracking-tight md:text-3xl lg:text-4xl">
            The hands behind <span className="text-[#8f897e]">the cut.</span>
          </h2>
        </motion.div>

        {/* Main barber feature */}
        <div className="grid grid-cols-1 items-stretch gap-6 md:flex-1 md:grid-cols-12 md:gap-8">
          {/* Portrait. Height comes from the grid row on desktop; min-height keeps it sane. */}
          <div className="relative mx-auto h-[300px] w-full max-w-[240px] overflow-hidden border border-white/10 sm:h-[400px] sm:max-w-[280px] md:col-span-5 md:h-auto md:min-h-[420px] md:max-w-none">
            <AnimatePresence mode="wait">
              <motion.img
                key={current.id}
                src={current.image}
                alt={`${current.name}, ${current.role} at The Foundry`}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                style={prefersReducedMotion ? undefined : { y: imageY }}
                // Over-sized by 24px so the parallax never reveals an edge gap
                className="absolute inset-x-0 -top-3 h-[calc(100%+24px)] w-full object-cover object-top"
              />
            </AnimatePresence>

            {/* Editorial corner */}
            <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-amber-500" />

            <div className="absolute bottom-3 left-3 text-[11px] uppercase tracking-[0.25em] text-white/70">
              The Foundry · Austin
            </div>
          </div>

          {/* Barber information */}
          <div className="flex flex-col justify-between md:col-span-7">
            <div aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                    {current.role} · {current.years} Years
                  </div>

                  <h3 className="mt-1.5 text-2xl font-black uppercase leading-none tracking-tight md:text-3xl lg:text-4xl">
                    {current.name}
                  </h3>

                  <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#aaa398] md:text-sm">
                    {current.intro}
                  </p>

                  <div className="mt-3.5">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
                      Specialties
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {current.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="border border-white/15 px-2.5 py-1 text-[11px] uppercase tracking-wider"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <blockquote className="mt-3.5 border-l-2 border-amber-500 pl-3 text-xs italic text-[#e8e2d6]/80 md:text-sm">
                    &ldquo;{current.quote}&rdquo;
                  </blockquote>

                  <Link
                    to={`/book?barber=${current.slug}`}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-3 bg-amber-500 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-amber-400 sm:w-fit sm:justify-start sm:py-2.5 ${focusRing}`}
                  >
                    Book {current.firstName}
                    <span aria-hidden="true">→</span>
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Barber selector */}
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3.5">
              <div className="flex gap-1.5 sm:gap-2">
                {barbers.map((barber, index) => (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`View ${barber.name}`}
                    aria-pressed={index === active}
                    className={`relative h-10 w-10 shrink-0 overflow-hidden border transition-all duration-300 sm:h-12 sm:w-12 md:h-14 md:w-14 ${focusRing} ${
                      index === active
                        ? "border-amber-500 opacity-100"
                        : "border-white/15 opacity-45 hover:opacity-80"
                    }`}
                  >
                    <img
                      src={barber.image}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                    {index === active && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex shrink-0 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={previous}
                  aria-label="Previous barber"
                  className={`flex h-9 w-9 items-center justify-center border border-white/15 text-base transition hover:border-amber-500 hover:text-amber-500 sm:h-10 sm:w-10 ${focusRing}`}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next barber"
                  className={`flex h-9 w-9 items-center justify-center border border-white/15 text-base transition hover:border-amber-500 hover:text-amber-500 sm:h-10 sm:w-10 ${focusRing}`}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Barbers;