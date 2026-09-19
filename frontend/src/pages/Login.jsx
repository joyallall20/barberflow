import { useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

import useAuthStore from "../store/authStore";
import { sendPasswordReset } from "../services/authService";

const EASE = [0.22, 1, 0.36, 1];

/* ---------- Firebase error mapping ---------- */

const mapAuthError = (err) => {
  const code = err?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact the shop.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network issue. Check your connection and try again.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup. Allow popups and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with that email using a different sign-in method.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled for this project.";
    default:
      return err?.message || "Unable to sign in. Please try again.";
  }
};

/* ---------- role → home ---------- */

const homeForRole = (role) => {
  if (role === "admin" || role === "owner") {
    return "/admin";
  }

  if (role === "barber") {
    return "/barber";
  }

  return "/my-appointments";
};

/* ---------- deep-link authorization ---------- */

/**
 * Given a requested `from` path and the signed-in user's role,
 * returns the path the user should actually be sent to.
 *
 * - /admin/*  requires admin or owner
 * - /barber/* requires barber
 * - anything else is allowed
 */
const resolvePostLoginPath = (from, role) => {
  if (!from) {
    return homeForRole(role);
  }

  if (from.startsWith("/admin") && !["admin", "owner"].includes(role)) {
    return homeForRole(role);
  }

  if (from.startsWith("/barber") && role !== "barber") {
    return homeForRole(role);
  }

  return from;
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  // State machine: "signin" | "reset" | "resetSent"
  const [view, setView] = useState("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → role-based redirect (respects deep-link target).
  if (!loading && !bootstrapping && user && role) {
    const from = location.state?.from?.pathname;
    return <Navigate to={resolvePostLoginPath(from, role)} replace />;
  }

  /* ---------- submit: sign in ---------- */

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);

      // login() hydrates mongoUser; read fresh role from the store.
      const nextRole = useAuthStore.getState().role;
      const from = location.state?.from?.pathname;

      navigate(resolvePostLoginPath(from, nextRole), { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- submit: google sign-in ---------- */

  const handleGoogleSignIn = async () => {
    setError("");
    setSubmitting(true);

    try {
      await loginWithGoogle();

      const nextRole = useAuthStore.getState().role;
      const from = location.state?.from?.pathname;

      navigate(resolvePostLoginPath(from, nextRole), { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- submit: password reset ---------- */

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await sendPasswordReset(email.trim());
      setView("resetSent");
      toast.success("Reset link sent. Check your inbox.");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const goSignIn = () => {
    setError("");
    setView("signin");
  };

  const goReset = () => {
    setError("");
    setView("reset");
  };

  /* ---------- UI ---------- */

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#141311] px-5 py-16 text-[#e8e2d6]">
      {/* Oversized background wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="whitespace-nowrap text-[22vw] font-black uppercase leading-none text-white/[0.02]">
          Foundry
        </span>
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand */}
        <Link to="/" className="group mb-10 block">
          <div className="text-xl font-black tracking-[0.2em] text-[#e8e2d6] transition-colors group-hover:text-amber-500">
            THE FOUNDRY
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.35em] text-[#8f897e]">
            Classic craft. Modern edge.
          </div>
        </Link>

        <AnimatePresence mode="wait">
          {/* ---------- SIGN IN ---------- */}
          {view === "signin" && (
            <motion.div
              key="signin"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                <span className="h-px w-8 bg-amber-500" />
                Account
              </div>

              <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
                Sign in
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-[#8f897e]">
                Access your appointments and account.
              </p>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="mt-8 flex w-full items-center justify-center gap-3 border border-white/15 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#141311] px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
                    or
                  </span>
                </div>
              </div>

              {/* Email / password form */}
              <form onSubmit={handleSignIn} className="space-y-5">
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                {error && <ErrorBlock message={error} />}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-500 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Signing In…" : "Sign In"}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={goReset}
                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500"
                  >
                    Forgot password?
                  </button>

                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#3a3733]">
                    Create an account — coming soon
                  </span>
                </div>
              </form>
            </motion.div>
          )}

          {/* ---------- RESET ---------- */}
          {view === "reset" && (
            <motion.div
              key="reset"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                <span className="h-px w-8 bg-amber-500" />
                Reset
              </div>

              <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
                Reset your password
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-[#8f897e]">
                Enter your email and we&apos;ll send you a password reset link.
              </p>

              <form onSubmit={handleReset} className="mt-8 space-y-5">
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                {error && <ErrorBlock message={error} />}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-500 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send Reset Link"}
                </button>

                <button
                  type="button"
                  onClick={goSignIn}
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:text-amber-500"
                >
                  ← Back to Sign In
                </button>
              </form>
            </motion.div>
          )}

          {/* ---------- RESET SENT ---------- */}
          {view === "resetSent" && (
            <motion.div
              key="resetSent"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                <span className="h-px w-8 bg-amber-500" />
                Sent
              </div>

              <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
                Reset link sent
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-[#8f897e]">
                Check your email for instructions to create a new password.
              </p>

              <p className="mt-4 text-xs leading-relaxed text-[#625f58]">
                Sent to <span className="text-[#e8e2d6]">{email}</span>
              </p>

              <button
                type="button"
                onClick={goSignIn}
                className="mt-8 w-full border border-white/15 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
              >
                Back to Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-12 text-[10px] uppercase tracking-[0.25em] text-[#625f58]">
          Demo account · The Foundry is a fictional barbershop
        </p>
      </motion.div>
    </main>
  );
};

/* ---------- pieces ---------- */

const Field = ({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
}) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
      {label}
    </span>
    <input
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      required={required}
      className="w-full border border-white/15 bg-transparent px-4 py-3.5 text-sm text-[#e8e2d6] placeholder:text-[#3a3733] outline-none transition-colors focus:border-amber-500"
    />
  </label>
);

const ErrorBlock = ({ message }) => (
  <div
    role="alert"
    aria-live="polite"
    className="border border-red-500/30 bg-red-500/[0.04] p-4 text-xs leading-relaxed text-red-400"
  >
    {message}
  </div>
);

const GoogleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.57-5.15 3.57-8.65z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.07.72-2.44 1.14-4.07 1.14-3.13 0-5.79-2.12-6.74-4.96H1.29v3.09A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.26 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a12 12 0 0 0 0 10.72l3.97-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.36.61 4.61 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.64l3.97 3.09C6.21 6.87 8.87 4.75 12 4.75z"
    />
  </svg>
);

export default Login;