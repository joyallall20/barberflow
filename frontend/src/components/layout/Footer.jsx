import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link
              to="/"
              className="text-2xl font-black tracking-[0.2em]"
            >
              THE FOUNDRY
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-neutral-500">
              Classic craft. Modern edge. Premium barbering
              for those who appreciate the details.
            </p>

            <Link
              to="/book"
              className="mt-7 inline-block border border-white px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] transition hover:bg-white hover:text-black"
            >
              Book a Cut
            </Link>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              Explore
            </h3>

            <nav className="mt-5 flex flex-col gap-4">
              <a
                href="/#services"
                className="text-sm text-neutral-500 transition hover:text-white"
              >
                Services
              </a>

              <a
                href="/#barbers"
                className="text-sm text-neutral-500 transition hover:text-white"
              >
                Barbers
              </a>

              <a
                href="/#story"
                className="text-sm text-neutral-500 transition hover:text-white"
              >
                Our Story
              </a>

              <a
                href="/#visit"
                className="text-sm text-neutral-500 transition hover:text-white"
              >
                Visit
              </a>
            </nav>
          </div>

          {/* Visit */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              Visit
            </h3>

            <div className="mt-5 space-y-4 text-sm leading-6 text-neutral-500">
              <p>
                Austin, Texas
                <br />
                United States
              </p>

              <p>
                Mon–Sat
                <br />
                9:00 AM – 7:00 PM
              </p>

              <a
                href="tel:+15125550147"
                className="block transition hover:text-white"
              >
                (512) 555-0147
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.16em] text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} The Foundry.
            All rights reserved.
          </p>

          <p>
            Austin, TX
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;