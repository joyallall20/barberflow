import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";

import useUIStore from "../../store/uiStore";
import useAuthStore from "../../store/authStore";

const Navbar = () => {
  const navigate = useNavigate();

  const { mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const logout = useAuthStore((s) => s.logout);

  // While Firebase/backend identity is resolving, treat as logged out
  // so we don't flash the wrong menu.
  const resolved = !loading && !bootstrapping;
  const isAuthed = resolved && !!user && !!role;
  const isStaff = role === "admin" || role === "owner";

  const navItems = [
    { label: "Services", href: "/#services" },
    { label: "Barbers", href: "/#barbers" },
    { label: "Our Story", href: "/#story" },
    { label: "Visit", href: "/#visit" },
  ];

  const handleLogout = async () => {
    closeMobileMenu();
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Brand */}
        <Link to="/" onClick={closeMobileMenu} className="group">
          <div className="text-xl font-black tracking-[0.2em] text-white transition-colors group-hover:text-amber-500">
            THE FOUNDRY
          </div>

          <div className="mt-0.5 text-[9px] uppercase tracking-[0.35em] text-neutral-500">
            Classic craft. Modern edge.
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400 transition-colors duration-300 hover:text-amber-500"
            >
              {item.label}
            </a>
          ))}

          {/* Logged out */}
          {!isAuthed && (
            <>
              <Link
                to="/login"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 transition-colors duration-300 hover:text-amber-500"
              >
                Login
              </Link>

              <Link
                to="/book"
                className="border border-amber-500 bg-amber-500 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-black transition-all duration-300 hover:bg-transparent hover:text-amber-500"
              >
                Book a Cut
              </Link>
            </>
          )}

          {/* Logged in — customer */}
          {isAuthed && !isStaff && (
            <>
              <Link
                to="/my-appointments"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 transition-colors duration-300 hover:text-amber-500"
              >
                My Appointments
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 transition-colors duration-300 hover:text-amber-500"
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          )}

          {/* Logged in — admin / owner */}
          {isAuthed && isStaff && (
            <>
              <Link
                to="/admin"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 transition-colors duration-300 hover:text-amber-500"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 transition-colors duration-300 hover:text-amber-500"
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          className="flex h-10 w-10 items-center justify-center border border-white/10 text-white transition-colors hover:border-amber-500 hover:text-amber-500 md:hidden"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-neutral-950 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={closeMobileMenu}
                className="border-b border-white/10 py-5 text-sm font-medium uppercase tracking-[0.18em] text-neutral-300 transition-colors duration-300 hover:text-amber-500"
              >
                {item.label}
              </a>
            ))}

            {/* Logged out */}
            {!isAuthed && (
              <>
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="border-b border-white/10 py-5 text-sm font-medium uppercase tracking-[0.18em] text-neutral-300 transition-colors duration-300 hover:text-amber-500"
                >
                  Login
                </Link>

                <Link
                  to="/book"
                  onClick={closeMobileMenu}
                  className="mt-6 border border-amber-500 bg-amber-500 px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-black transition-all duration-300 hover:bg-transparent hover:text-amber-500"
                >
                  Book a Cut
                </Link>
              </>
            )}

            {/* Logged in — customer */}
            {isAuthed && !isStaff && (
              <>
                <Link
                  to="/my-appointments"
                  onClick={closeMobileMenu}
                  className="border-b border-white/10 py-5 text-sm font-medium uppercase tracking-[0.18em] text-neutral-300 transition-colors duration-300 hover:text-amber-500"
                >
                  My Appointments
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-6 inline-flex items-center justify-center gap-2 border border-white/15 px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-neutral-300 transition-colors duration-300 hover:border-amber-500 hover:text-amber-500"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            )}

            {/* Logged in — admin / owner */}
            {isAuthed && isStaff && (
              <>
                <Link
                  to="/admin"
                  onClick={closeMobileMenu}
                  className="border-b border-white/10 py-5 text-sm font-medium uppercase tracking-[0.18em] text-neutral-300 transition-colors duration-300 hover:text-amber-500"
                >
                  Dashboard
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-6 inline-flex items-center justify-center gap-2 border border-white/15 px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-neutral-300 transition-colors duration-300 hover:border-amber-500 hover:text-amber-500"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;