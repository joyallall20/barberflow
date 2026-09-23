import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const Services = () => {
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const wordmarkY = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);
  const kickerY = useTransform(scrollYProgress, [0, 1], [-10, 10]);

  const services = [
    {
      num: "01",
      name: "Signature Cut",
      desc: "Classic cut · consultation · finish",
      price: "$45",
    },
    {
      num: "02",
      name: "Cut + Beard",
      desc: "Signature cut · beard sculpt · finish",
      price: "$65",
    },
    {
      num: "03",
      name: "Hot Towel Shave",
      desc: "Traditional straight-razor shave · hot towel ritual",
      price: "$40",
    },
    {
      num: "04",
      name: "The Foundry Experience",
      desc: "Cut · beard · hot towel · styling",
      price: "$85",
    },
  ];

  return (
    <section
      id="services"
      ref={sectionRef}
      className="relative overflow-hidden border-b border-white/10 bg-[#141311] text-[#e8e2d6]"
    >
      {/* Oversized background wordmark — slow parallax layer */}
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
        {/* Heading */}
        <motion.div
          style={prefersReducedMotion ? undefined : { y: kickerY }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              <span className="h-px w-8 bg-amber-500" />
              Services
            </div>
            <h2 className="max-w-xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">
              What we do best.
            </h2>
          </div>

          <div className="flex flex-col gap-2 md:items-end md:text-right">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#a89f8f]">
              The Craft
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-[#a89f8f]">
              Classic barbering, modern precision.
            </p>
          </div>
        </motion.div>

        {/* Service list */}
        <div className="border-t border-white/10">
          {services.map(({ num, name, desc, price }, index) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={prefersReducedMotion ? undefined : { x: 6 }}
              className="group relative border-b border-white/10 py-6 md:py-8"
            >
              {/* Accent line */}
              <span className="absolute left-0 top-0 h-full w-[2px] origin-top scale-y-0 bg-amber-500 transition-transform duration-300 group-hover:scale-y-100" />

              <div className="flex flex-col gap-2 pl-4 md:flex-row md:items-baseline md:justify-between md:gap-6">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-4 md:flex-nowrap md:gap-x-6 md:pr-0">
                  <span className="text-xl font-extrabold tracking-tight text-[#a89f8f] transition-colors duration-300 group-hover:text-amber-500 sm:text-2xl md:text-3xl">
                    {num}
                  </span>
                  <span className="text-base font-bold uppercase tracking-tight text-[#e8e2d6] sm:text-xl md:text-2xl">
                    {name}
                  </span>
                </div>

                <span className="pl-[3.25rem] text-lg font-semibold text-[#e8e2d6] transition-colors duration-300 group-hover:text-amber-500 md:pl-0 md:text-xl">
                  {price}
                </span>
              </div>

              <p className="mt-2 pl-4 text-sm leading-relaxed text-[#a89f8f] md:pl-[4.75rem]">
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;