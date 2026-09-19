import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Scissors,
  UserRound,
  X,
  RefreshCw,
} from "lucide-react";

import {
  getMyAppointments,
  cancelMyAppointment,
} from "../services/public";

const formatDate = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
};

const getAppointmentDateTime = (appointment) => {
  const date = new Date(appointment.date);

  const [hours, minutes] = (appointment.startTime || "00:00")
    .split(":")
    .map(Number);

  date.setUTCHours(hours, minutes, 0, 0);

  return date;
};

const isUpcoming = (appointment) => {
  const status = appointment.status?.toLowerCase();

  if (["cancelled", "completed", "no_show"].includes(status)) {
    return false;
  }

  return getAppointmentDateTime(appointment) >= new Date();
};

const statusStyles = {
  confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  no_show: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function AppointmentCard({ appointment, onCancel, cancelling }) {
  const status = appointment.status?.toLowerCase() || "confirmed";

  const serviceName =
    appointment.service?.name ||
    appointment.serviceName ||
    "Barber Service";

  const barberName =
    appointment.barber?.name ||
    appointment.barberName ||
    "Your Barber";

  const canCancel =
    ["confirmed", "pending"].includes(status) &&
    isUpcoming(appointment);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-black/10 bg-[#f5f0e8] p-5 md:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                statusStyles[status] ||
                "bg-black/5 text-black/70 border-black/10"
              }`}
            >
              {status.replace("_", " ")}
            </span>

            <span className="text-xs uppercase tracking-[0.15em] text-black/45">
              Appointment
            </span>
          </div>

          <div>
            <h3 className="font-serif text-2xl text-[#171513]">
              {serviceName}
            </h3>

            <div className="mt-3 grid gap-2 text-sm text-black/65 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} />
                <span>{formatDate(appointment.date)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock3 size={16} />
                <span>
                  {appointment.startTime || "—"}
                  {appointment.endTime
                    ? ` – ${appointment.endTime}`
                    : ""}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <UserRound size={16} />
                <span>{barberName}</span>
              </div>

              <div className="flex items-center gap-2">
                <Scissors size={16} />
                <span>
                  {appointment.price != null
                    ? `$${appointment.price}`
                    : "Price unavailable"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(appointment)}
            disabled={cancelling === appointment._id}
            className="flex items-center justify-center gap-2 border border-red-900/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-red-800 transition hover:bg-red-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={15} />
            {cancelling === appointment._id
              ? "Cancelling..."
              : "Cancel"}
          </button>
        )}
      </div>

      {appointment.notes && (
        <div className="mt-5 border-t border-black/10 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Notes
          </p>
          <p className="mt-1 text-sm text-black/65">
            {appointment.notes}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);

  const loadAppointments = async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getMyAppointments();

      const data = response?.data;

      setAppointments(
        Array.isArray(data?.appointments)
          ? data.appointments
          : []
      );
    } catch (err) {
      console.error("Failed to load appointments:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load your appointments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const upcomingAppointments = useMemo(
    () => appointments.filter(isUpcoming),
    [appointments]
  );

  const historyAppointments = useMemo(
    () => appointments.filter((appointment) => !isUpcoming(appointment)),
    [appointments]
  );

  const handleCancel = async (appointment) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    try {
      setCancelling(appointment._id);

      await cancelMyAppointment(appointment._id);

      await loadAppointments(true);
    } catch (err) {
      console.error("Failed to cancel appointment:", err);

      window.alert(
        err?.response?.data?.message ||
          "Unable to cancel this appointment."
      );
    } finally {
      setCancelling(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#ebe5da] px-5 py-24 text-[#171513] md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#b4512c]">
              The Foundry
            </p>

            <h1 className="font-serif text-4xl md:text-5xl">
              My Appointments
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">
              Keep track of your upcoming cuts and your appointment history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadAppointments(true)}
            disabled={refreshing}
            className="flex w-fit items-center gap-2 border border-black/15 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition hover:bg-black hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-8 border border-red-900/20 bg-red-900/5 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-[#b4512c]" />
              <p className="text-xs uppercase tracking-[0.2em] text-black/45">
                Loading appointments
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-14">
            {/* Upcoming */}
            <section>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b4512c]">
                    Next up
                  </p>

                  <h2 className="mt-1 font-serif text-3xl">
                    Upcoming
                  </h2>
                </div>

                <span className="text-sm text-black/40">
                  {upcomingAppointments.length}
                </span>
              </div>

              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      onCancel={handleCancel}
                      cancelling={cancelling}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-black/15 px-6 py-14 text-center">
                  <CalendarDays
                    className="mx-auto mb-4 text-black/25"
                    size={30}
                  />

                  <h3 className="font-serif text-xl">
                    No upcoming appointments
                  </h3>

                  <p className="mt-2 text-sm text-black/45">
                    Ready for a fresh cut?
                  </p>
                </div>
              )}
            </section>

            {/* History */}
            <section>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                    Past visits
                  </p>

                  <h2 className="mt-1 font-serif text-3xl">
                    History
                  </h2>
                </div>

                <span className="text-sm text-black/40">
                  {historyAppointments.length}
                </span>
              </div>

              {historyAppointments.length > 0 ? (
                <div className="space-y-4">
                  {historyAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      onCancel={handleCancel}
                      cancelling={cancelling}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-black/15 px-6 py-14 text-center">
                  <Clock3
                    className="mx-auto mb-4 text-black/25"
                    size={30}
                  />

                  <h3 className="font-serif text-xl">
                    No appointment history
                  </h3>

                  <p className="mt-2 text-sm text-black/45">
                    Your completed and cancelled appointments will appear here.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}