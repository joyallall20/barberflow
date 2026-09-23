import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const barbers = [
  {
    id: 1,
    name: "Marcus Reed",
    firstName: "Marcus",
    role: "Master Barber",
    years: 12,
    image: "/barber1.png",
    specialties: ["Classic Cuts", "Skin Fades", "Beard Sculpting"],
    intro:
      "Marcus brings a classic barber's discipline to every chair. His approach is precise, relaxed, and built around understanding exactly what each client wants.",
    quote: "Classic cuts. No shortcuts.",
  },
  {
    id: 2,
    name: "James Carter",
    firstName: "James",
    role: "Master Barber",
    years: 9,
    image: "/barber2.png",
    specialties: ["Traditional Cuts", "Modern Styling", "Taper Fades"],
    intro:
      "James blends traditional barbering with a modern Austin edge. He believes the best cut is one that looks effortless when you walk out the door.",
    quote: "Details make the difference.",
  },
  {
    id: 3,
    name: "David Cole",
    firstName: "David",
    role: "Master Barber",
    years: 8,
    image: "/barber3.png",
    specialties: ["Beard Sculpting", "Hot Towel Shaves", "Classic Cuts"],
    intro:
      "David is known for his attention to detail and his appreciation for the traditional barbering ritual, from the first consultation to the final hot towel.",
    quote: "The ritual matters.",
  },
  {
    id: 4,
    name: "Ryan Hayes",
    firstName: "Ryan",
    role: "Master Barber",
    years: 7,
    image: "/barber4.png",
    specialties: ["Skin Fades", "Textured Cuts", "Modern Styling"],
    intro:
      "Ryan combines modern technique with the relaxed atmosphere of an old-school barbershop. His specialty is clean, natural-looking styles built around each client's personality.",
    quote: "Make it yours.",
  },
];

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

  const next = () => {
    setActive((prev) => (prev + 1) % barbers.length);
  };

  const previous = () => {
    setActive((prev) => (prev - 1 + barbers.length) % barbers.length);
  };

  return (
    <section
      id="barbers"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#141311] text-[#e8e2d6] md:h-[calc(100vh-80px)]"
    >
      {/* Subtle background wordmark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="whitespace-nowrap text-[16vw] font-black uppercase leading-none text-white/[0.025]">
          Foundry
        </span>
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 py-10 md:h-full md:px-12 md:py-7 lg:px-16">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-4 md:mb-5"
        >
          <div className="mb-1.5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            <span className="h-px w-8 bg-amber-500" />
            The Craftsmen
          </div>

          <h2 className="text-2xl font-extrabold uppercase leading-[0.9] tracking-tight md:text-3xl lg:text-4xl">
            The hands behind{" "}
            <span className="text-[#8f897e]">the cut.</span>
          </h2>
        </motion.div>

        {/* Main barber feature */}
        <div className="grid grid-cols-1 items-stretch gap-6 md:min-h-0 md:flex-1 md:grid-cols-12 md:gap-8">
          {/* Large image — portrait ratio, height-capped so it fits the viewport */}
          <div className="relative mx-auto h-[300px] w-full max-w-[240px] overflow-hidden border border-white/10 sm:h-[400px] sm:max-w-[280px] md:col-span-5 md:h-full md:max-h-full md:max-w-none">
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
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </AnimatePresence>

            {/* Editorial corner */}
            <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-amber-500" />

            <div className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.25em] text-white/60">
              The Foundry · Austin
            </div>
          </div>

          {/* Barber information */}
          <div className="flex flex-col justify-between md:col-span-7 md:min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.4 }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                  {current.role} · {current.years} Years
                </div>

                <h3 className="mt-1.5 text-2xl font-black uppercase leading-none tracking-tight md:text-3xl lg:text-4xl">
                  {current.name}
                </h3>

                <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#aaa398] md:text-sm">
                  {current.intro}
                </p>

                <div className="mt-3.5">
                  <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#8f897e]">
                    Specialties
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {current.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-wider"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <blockquote className="mt-3.5 border-l-2 border-amber-500 pl-3 text-xs italic text-[#e8e2d6]/80 md:text-sm">
                  "{current.quote}"
                </blockquote>

                <a
                  href="/book"
                  className="mt-4 inline-flex w-full items-center justify-center gap-3 bg-amber-500 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141311] sm:w-fit sm:justify-start sm:py-2.5"
                >
                  Book {current.firstName}
                  <span>→</span>
                </a>
              </motion.div>
            </AnimatePresence>

            {/* ---- Barber selector ---- */}
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3.5">
              <div className="flex gap-1.5 sm:gap-2">
                {barbers.map((barber, index) => (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`View ${barber.name}`}
                    className={`relative h-10 w-10 shrink-0 overflow-hidden border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141311] sm:h-12 sm:w-12 md:h-14 md:w-14 ${
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
                  className="flex h-9 w-9 items-center justify-center border border-white/15 text-base transition hover:border-amber-500 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141311] sm:h-10 sm:w-10"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Next barber"
                  className="flex h-9 w-9 items-center justify-center border border-white/15 text-base transition hover:border-amber-500 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141311] sm:h-10 sm:w-10"
                >
                  →
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