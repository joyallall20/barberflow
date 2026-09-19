import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const MAP_EMBED =
  "https://www.google.com/maps?q=South+Congress+Ave,+Austin,+TX&output=embed";

const MAP_DIRECTIONS =
  "https://www.google.com/maps/dir/?api=1&destination=South+Congress+Ave,+Austin,+TX";

const EASE = [0.22, 1, 0.36, 1];

const Shop = () => {
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

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

  // Headline area text: cream → dark
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
  const labelColor = useTransform(
    scrollYProgress,
    [0.5, 1],
    ["#f59e0b", "#d97706"]
  );

  // Very subtle parallax on the photograph
  const imageY = useTransform(scrollYProgress, [0, 1], [-14, 14]);

  return (
    <motion.section
      id="visit"
      ref={sectionRef}
      style={prefersReducedMotion ? undefined : { backgroundColor }}
      className="relative overflow-hidden bg-[#e8e2d6] text-[#141311]"
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
            className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em]"
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
            built to feel like the kind of place you come back to — not just
            for the cut, but for the experience.
          </motion.p>
        </motion.div>

        {/* ---------- Two-column: Photo | Info ---------- */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-12">
          {/* Photograph — wider desktop frame matches the cinematic hero shot */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative aspect-[4/5] w-full overflow-hidden border border-black/15 md:col-span-7 md:aspect-[16/10]"
          >
            <motion.img
              src="/hero.jfif"
              alt="Interior of The Foundry barbershop in South Austin"
              style={prefersReducedMotion ? undefined : { y: imageY }}
              className="absolute inset-0 -top-[14px] h-[calc(100%+28px)] w-full object-cover object-center"
            />
            <div className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.25em] text-white/70">
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
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-600">
                South Austin · Texas
              </div>

              <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-tight md:text-3xl">
                The Foundry
              </h3>

              <div className="mt-5 space-y-1 text-sm leading-relaxed text-[#625f58]">
                <p className="font-semibold text-[#141311]">
                  1234 South Congress Ave
                </p>
                <p>Austin, TX</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">
                  Demo location · South Austin
                </p>
              </div>

              {/* Hours */}
              <div className="mt-7 border-t border-black/15 pt-5">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
                  Hours
                </div>

                <dl className="space-y-2 text-sm">
                  <div className="flex items-baseline justify-between">
                    <dt className="uppercase tracking-wider">Mon — Sat</dt>
                    <dd className="text-[#625f58]">9:00 AM — 7:00 PM</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="uppercase tracking-wider">Sunday</dt>
                    <dd className="text-[#625f58]">Closed</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Directions CTA */}
            <a
              href={MAP_DIRECTIONS}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-fit items-center gap-3 bg-[#141311] px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#e8e2d6] transition-colors hover:bg-amber-600 hover:text-[#141311]"
            >
              Get Directions
              <span aria-hidden>→</span>
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
          <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
            <span className="h-px w-8 bg-[#625f58]" />
            South Austin · Demo Map
          </div>

          <div className="relative h-[280px] w-full overflow-hidden border border-black/15 md:h-[360px]">
            <iframe
              title="Map of The Foundry demo location in South Austin, Texas"
              src={MAP_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full"
              style={{ border: 0 }}
              allowFullScreen
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Shop;