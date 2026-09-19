import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_WORKING_HOURS = DAYS.map((_, index) => ({
  day: index,
  isWorking: index >= 1 && index <= 5, // Mon-Fri default working
  startTime: "09:00",
  endTime: "18:00",
}));

const BarberWorkingHoursModal = ({ barber, onClose, onSubmit }) => {
  const [workingHours, setWorkingHours] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (barber && barber.workingHours && barber.workingHours.length > 0) {
      // Ensure all 7 days are represented and sorted
      const existingMap = new Map(
        barber.workingHours.map((wh) => [wh.day, wh])
      );
      
      const completeHours = DAYS.map((_, index) => {
        const existing = existingMap.get(index);
        return {
          day: index,
          isWorking: existing?.isWorking ?? false,
          startTime: existing?.startTime || "09:00",
          endTime: existing?.endTime || "18:00",
        };
      });
      setWorkingHours(completeHours);
    } else {
      setWorkingHours(DEFAULT_WORKING_HOURS);
    }
  }, [barber]);

  const handleChange = (index, field, value) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], [field]: value };
    setWorkingHours(updated);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setSubmitting(true);
      await onSubmit(workingHours, barber?._id ?? barber?.id);
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update working hours."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70"
        onClick={submitting ? undefined : onClose}
      />

      <div className="relative z-10 w-full max-w-2xl border border-white/10 bg-[#141311] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5 sticky top-0 bg-[#141311] z-10">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              {barber?.name}
            </div>

            <h2 className="mt-1 text-xl font-extrabold uppercase tracking-tight text-[#e8e2d6]">
              Working Hours
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-5 border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs leading-relaxed text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {workingHours.map((wh, index) => (
              <div 
                key={wh.day} 
                className={`flex items-center gap-4 border border-white/10 p-4 transition-colors ${
                  wh.isWorking ? "bg-[#0f0e0d]" : "bg-[#0f0e0d]/50 opacity-60"
                }`}
              >
                <div className="w-28 font-semibold text-sm uppercase tracking-wide text-[#e8e2d6]">
                  {DAYS[wh.day]}
                </div>
                
                <label className="flex cursor-pointer items-center gap-2 mr-4">
                  <input
                    type="checkbox"
                    checked={wh.isWorking}
                    onChange={(e) => handleChange(index, "isWorking", e.target.checked)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span className="text-[10px] uppercase tracking-[0.1em] text-[#8f897e]">
                    Working
                  </span>
                </label>

                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="time"
                    value={wh.startTime}
                    onChange={(e) => handleChange(index, "startTime", e.target.value)}
                    disabled={!wh.isWorking}
                    className="flex-1 border border-white/10 bg-black px-3 py-2 text-sm text-[#e8e2d6] outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <span className="text-[#625f58]">to</span>
                  <input
                    type="time"
                    value={wh.endTime}
                    onChange={(e) => handleChange(index, "endTime", e.target.value)}
                    disabled={!wh.isWorking}
                    className="flex-1 border border-white/10 bg-black px-3 py-2 text-sm text-[#e8e2d6] outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 mt-6 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-white/30 hover:text-[#e8e2d6] disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="border border-amber-500 bg-amber-500 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Hours"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BarberWorkingHoursModal;
