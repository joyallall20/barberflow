import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  RefreshCw,
  User,
  Mail,
  Scissors,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import useAuthStore from "../../store/authStore";
import { getMyBarberProfile } from "../../services/barberService";

const EASE = [0.22, 1, 0.36, 1];

const BarberProfilePage = () => {
  const prefersReducedMotion = useReducedMotion();
  const mongoUser = useAuthStore((s) => s.mongoUser);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getMyBarberProfile();
      setProfile(res?.data ?? res);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to load your profile.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const barberName = profile?.name || mongoUser?.name || "Barber";
  const email = profile?.email || mongoUser?.email || "—";
  const photo = profile?.photo || "";
  const bio = profile?.bio || "";
  const specialties = Array.isArray(profile?.specialties)
    ? profile.specialties
    : [];

  const initials = barberName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const workingDays =
    profile?.workingHours?.filter((day) => day.isWorking).length || 0;

  if (loading) {
    return (
      <div>
        <div className="mb-2 h-3 w-24 animate-pulse bg-white/5" />
        <div className="h-8 w-56 animate-pulse bg-white/5" />
        <div className="mt-4 h-5 w-72 animate-pulse bg-white/5" />

        <div className="mt-10 grid gap-px border border-white/10 bg-white/5 lg:grid-cols-[280px_1fr]">
          <div className="h-80 animate-pulse bg-[#141311]" />
          <div className="h-80 animate-pulse bg-[#141311]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
          Something went wrong
        </div>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8f897e]">
          {error}
        </p>

        <button
          type="button"
          onClick={fetchProfile}
          className="mt-6 flex items-center gap-2 border border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
        >
          <RefreshCw size={13} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Profile
          </div>

          <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
            My Profile
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
            Your professional profile at The Foundry.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchProfile}
          className="flex items-center gap-2 self-start border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </motion.div>

      {/* Main profile */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className="mt-10 grid border border-white/10 lg:grid-cols-[280px_1fr]"
      >
        {/* Portrait */}
        <div className="border-b border-white/10 bg-white/[0.02] p-6 lg:border-b-0 lg:border-r">
          <div className="aspect-[4/5] overflow-hidden border border-white/10 bg-[#0f0e0d]">
            {photo ? (
              <img
                src={photo}
                alt={barberName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-6xl font-black tracking-tight text-[#625f58]">
                  {initials || "B"}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span
              className={`h-2 w-2 ${
                profile?.active !== false
                  ? "bg-emerald-500"
                  : "bg-[#625f58]"
              }`}
            />

            <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              {profile?.active !== false ? "Active Barber" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Information */}
        <div className="p-6 lg:p-8">
          <div className="border-b border-white/10 pb-6">
            <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
              Professional Identity
            </div>

            <h2 className="mt-3 text-2xl font-extrabold uppercase tracking-tight text-[#e8e2d6] md:text-3xl">
              {barberName}
            </h2>

            {bio && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#aaa398]">
                {bio}
              </p>
            )}
          </div>

          {/* Details */}
          <div className="grid gap-px border-b border-white/10 bg-white/10 sm:grid-cols-2">
            <div className="bg-[#141311] p-5">
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
                <Mail size={13} className="text-amber-500" />
                Email
              </div>

              <div className="mt-3 break-all text-sm font-semibold text-[#e8e2d6]">
                {email}
              </div>
            </div>

            <div className="bg-[#141311] p-5">
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
                <Clock size={13} className="text-amber-500" />
                Working Days
              </div>

              <div className="mt-3 text-sm font-semibold text-[#e8e2d6]">
                {workingDays} days / week
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="border-b border-white/10 py-6">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
              <Scissors size={13} className="text-amber-500" />
              Specialties
            </div>

            {specialties.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="border border-white/10 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#aaa398]"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#625f58]">
                No specialties have been added yet.
              </p>
            )}
          </div>

          {/* Account */}
          <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#625f58]">
                <ShieldCheck size={13} className="text-amber-500" />
                Account
              </div>

              <p className="mt-2 text-xs text-[#8f897e]">
                Your account is linked to your barber workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 border border-emerald-500/20 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-500">
              <User size={12} />
              Barber Account
            </div>
          </div>
        </div>
      </motion.div>

      {/* Schedule note */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 border-t border-white/10 pt-6"
      >
        <div className="flex items-start gap-3">
          <Clock
            size={14}
            className="mt-0.5 flex-shrink-0 text-amber-500"
          />

          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
              Working Hours
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#8f897e]">
              Manage your availability and working hours from the Schedule
              section.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BarberProfilePage;