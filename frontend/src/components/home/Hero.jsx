import { motion } from "framer-motion";
import { Scissors } from "lucide-react";

const Hero = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const fadeIn = {
    hidden: { opacity: 0, x: 30 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <section
      className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-black bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/hero.jfif')" }}
    >
      {/* Cinematic overlay */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-start px-6 pt-12 pb-8 md:px-12 md:pt-14 lg:px-16 lg:pt-16">
        <div className="flex w-full flex-col gap-8 md:flex-row md:items-start md:justify-between">

          {/* LEFT */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full max-w-3xl text-white md:w-[58%]"
          >
            {/* Location */}
            <motion.div
              variants={fadeUp}
              className="mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-amber-500"
            >
              <span className="h-px w-8 bg-amber-500" />
              Est. 2011 · Austin, Texas
            </motion.div>

            {/* Brand statement */}
            <motion.div
              variants={fadeUp}
              className="mb-4 inline-flex items-center gap-2 border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#e8e2d6]"
            >
              <Scissors size={12} />
              Classic Craft · Modern Edge
            </motion.div>

            {/* Main heading */}
            <motion.h1
              variants={fadeUp}
              className="mb-4 text-3xl font-extrabold uppercase leading-[0.96] tracking-tight sm:text-4xl sm:leading-[0.94] md:text-[4.5rem] md:leading-[0.92] lg:text-[5.25rem]"
            >
              <span className="block md:whitespace-nowrap">
                Old-School Craft.
              </span>

              <span className="block text-amber-500 md:whitespace-nowrap">
                Modern Austin.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="mb-5 max-w-lg text-sm leading-relaxed text-gray-200 md:text-base"
            >
              A barbershop built around the art of the cut. Classic technique,
              modern precision, and attention to detail in the heart of Austin.
            </motion.p>

            {/* CTA */}
            <motion.div variants={fadeUp}>
              <button
                onClick={() => {
                  window.location.href = "/book";
                }}
                className="w-full border border-amber-500 bg-amber-500 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-black transition-all duration-300 hover:bg-transparent hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:w-auto"
              >
                Book a Cut
              </button>
            </motion.div>
          </motion.div>

          {/* RIGHT IMAGE */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="hidden w-[42%] justify-end md:flex"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 180 }}
              className="relative"
            >
              {/* Editorial frame */}
              <div className="absolute -inset-3 border border-amber-500/30" />

              <img
                src="/owner.jfif"
                alt="The Foundry barber at work"
                className="relative h-[440px] w-[330px] object-cover lg:h-[470px] lg:w-[360px]"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom location label */}
      <div className="absolute bottom-5 left-6 z-20 hidden text-[9px] uppercase tracking-[0.3em] text-white/50 md:left-12 lg:left-16 md:block">
        South Austin · Texas
      </div>

      <div className="absolute bottom-5 right-6 z-20 hidden text-[9px] uppercase tracking-[0.3em] text-white/50 md:right-12 lg:right-16 md:block">
        The Art of the Cut
      </div>
    </section>
  );
};

export default Hero;