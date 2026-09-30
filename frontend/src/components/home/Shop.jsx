import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  ADDRESS,
  HOURS,
  INTERIOR_IMAGE,
  SHOW_DEMO_LABELS,
} from "./shop";

const MAP_QUERY = encodeURIComponent(ADDRESS.mapQuery);
const MAP_EMBED = `https://www.google.com/maps?q=${MAP_QUERY}&output=embed`;
const MAP_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`;

const EASE = [0.22, 1, 0.36, 1];

const Shop = () => {
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [mapActive, setMapActive] = useState(false);

  // Drives both the background color switch and the parallax
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.85", "start 0.35"],
  });

  // Background: dark → cream
  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.6, 1],
    ["#141311", "#141311", "#e8e2d6"]
  );

  // Heading-area text: cream → dark
  const headingColor = useTransform(
    scrollYProgress,
    [0.5, 1],
    ["#e8e2d6", "#141311"]
  );
  const headingMuted = useTransform(
    scrollYProgress,
    [0.5, 1],
    ["#8f897e", "#625f58"]
  );
  const bodyColor = useTransform(
    scrollYProgress,
    [0.5, 1],
    ["#aaa398", "#625f58"]
  );
  // End value is amber-800 (#92400e) so the label passes contrast on cream
  const labelColor = useTransform(
    scrollYProgress,
    [0.5, 1],
    ["#f59e0b", "#92400e"]
  );

  // Very subtle parallax on the photograph
  const imageY = useTransform(scrollYProgress, [0, 1], [-14, 14]);

  return (
    <motion.section
      id="visit"
      ref={sectionRef}
      style={prefersReducedMotion ? undefined : { backgroundColor }}
      className="relative scroll-mt-20 overflow-hidden bg-[#e8e2d6] text-[#141311]"
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20 lg:px-16">
        {/* ---------- Heading ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10 md:mb-14"
        >
          <motion.div
            style={prefersReducedMotion ? undefined : { color: labelColor }}
            className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em]"
          >
            <span className="h-px w-8 bg-current" />
            The Shop
          </motion.div>

          <motion.h2
            style={prefersReducedMotion ? undefined : { color: headingColor }}
            className="max-w-2xl text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl lg:text-5xl"
          >
            More than a chair.
            <br />
            <motion.span
              style={prefersReducedMotion ? undefined : { color: headingMuted }}
              className="inline-block"
            >
              It&apos;s the ritual.
            </motion.span>
          </motion.h2>

          <motion.p
            style={prefersReducedMotion ? undefined : { color: bodyColor }}
            className="mt-4 max-w-xl text-sm leading-relaxed md:text-base"
          >
            Dark leather. Old-school tools. Good conversation. The Foundry was
            built to feel like the kind of place you come back to, not just
            for the cut, but for the experience.
          </motion.p>
        </motion.div>

        {/* ---------- Two-column: Photo | Info ---------- */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-12">
          {/* Photograph */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative aspect-[4/5] w-full overflow-hidden border border-black/15 md:col-span-7 md:aspect-[16/10]"
          >
            <motion.img
              src={INTERIOR_IMAGE}
              alt="Interior of The Foundry barbershop in South Austin"
              loading="lazy"
              style={prefersReducedMotion ? undefined : { y: imageY }}
              className="absolute inset-0 -top-[14px] h-[calc(100%+28px)] w-full object-cover object-center"
            />
            <div className="absolute bottom-3 left-3 text-[11px] uppercase tracking-[0.25em] text-white/80">
              The Foundry · Interior
            </div>
          </motion.div>

          {/* Location, hours, CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="flex flex-col justify-between md:col-span-5"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-800">
                South Austin · Texas
              </div>

              <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-tight md:text-3xl">
                The Foundry
              </h3>

              <div className="mt-5 space-y-1 text-sm leading-relaxed text-[#625f58]">
                <p className="font-semibold text-[#141311]">{ADDRESS.street}</p>
                <p>{ADDRESS.city}</p>
                {SHOW_DEMO_LABELS && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-800">
                    Demo location · South Austin
                  </p>
                )}
              </div>

              {/* Hours */}
              <div className="mt-7 border-t border-black/15 pt-5">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
                  Hours
                </div>

                <dl className="space-y-2 text-sm">
                  {HOURS.map(({ days, time }) => (
                    <div
                      key={days}
                      className="flex items-baseline justify-between"
                    >
                      <dt className="uppercase tracking-wider">{days}</dt>
                      <dd className="text-[#625f58]">{time}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Directions CTA */}
            <a
              href={MAP_DIRECTIONS}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-full items-center justify-center gap-3 bg-[#141311] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-[#e8e2d6] transition-colors hover:bg-amber-600 hover:text-[#141311] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[#e8e2d6] sm:w-fit sm:justify-start sm:py-3"
            >
              Get Directions
              <span aria-hidden="true">→</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </motion.div>
        </div>

        {/* ---------- Map ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          className="mt-12 md:mt-16"
        >
          <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
            <span className="h-px w-8 bg-[#625f58]" />
            South Austin{SHOW_DEMO_LABELS ? " · Demo Map" : ""}
          </div>

          <div
            className="relative h-[220px] w-full overflow-hidden border border-black/15 sm:h-[280px] md:h-[360px]"
            onMouseLeave={() => setMapActive(false)}
          >
            <iframe
              title="Map of The Foundry in South Austin, Texas"
              src={MAP_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full"
              style={{ border: 0 }}
              allowFullScreen
            />

            {/* Stops the map from hijacking page scroll until the visitor opts in */}
            {!mapActive && (
              <button
                type="button"
                onClick={() => setMapActive(true)}
                aria-label="Activate map to pan and zoom"
                className="absolute inset-0 z-10 flex items-end justify-center bg-transparent pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-700"
              >
                <span className="bg-[#141311]/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8e2d6]">
                  Tap to explore map
                </span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Shop;