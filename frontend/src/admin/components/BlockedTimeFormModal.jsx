import { useEffect, useState } from "react";
import { X } from "lucide-react";

const EMPTY_FORM = {
  type: "one_time", // 'one_time' or 'recurring'
  scope: "all_barbers", // 'all_barbers' or 'barber'
  barber: "",
  date: "",
  daysOfWeek: [], // [0,1,2,3,4,5,6]
  startTime: "",
  endTime: "",
  reason: "",
  startDate: "",
  endDate: "",
  active: true,
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BlockedTimeFormModal = ({ blockedTime, barbers, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(blockedTime);

  useEffect(() => {
    if (!blockedTime) {
      setForm(EMPTY_FORM);
      return;
    }

    const isRec = blockedTime.isRecurring || blockedTime.scope;
    
    let dateStr = "";
    if (!isRec && blockedTime.date) {
      dateStr = new Date(blockedTime.date).toISOString().split("T")[0];
    }
    
    let startDStr = "";
    if (isRec && blockedTime.startDate) {
      startDStr = new Date(blockedTime.startDate).toISOString().split("T")[0];
    }
    
    let endDStr = "";
    if (isRec && blockedTime.endDate) {
      endDStr = new Date(blockedTime.endDate).toISOString().split("T")[0];
    }

    setForm({
      type: isRec ? "recurring" : "one_time",
      scope: blockedTime.scope || "all_barbers",
      barber: blockedTime.barber?._id || blockedTime.barber || "",
      date: dateStr,
      daysOfWeek: blockedTime.daysOfWeek || [],
      startTime: blockedTime.startTime ?? "",
      endTime: blockedTime.endTime ?? "",
      reason: blockedTime.reason ?? "",
      startDate: startDStr,
      endDate: endDStr,
      active: blockedTime.active ?? true,
    });
  }, [blockedTime]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleDay = (dayIndex) => {
    setForm((prev) => {
      const days = [...prev.daysOfWeek];
      if (days.includes(dayIndex)) {
        return { ...prev, daysOfWeek: days.filter(d => d !== dayIndex) };
      } else {
        return { ...prev, daysOfWeek: [...days, dayIndex].sort() };
      }
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.type === "one_time") {
      if (!form.barber) {
        setError("Please select a barber.");
        return;
      }
      if (!form.date) {
        setError("Please select a date.");
        return;
      }
    } else {
      if (form.scope === "barber" && !form.barber) {
        setError("Please select a barber.");
        return;
      }
      if (form.daysOfWeek.length === 0) {
        setError("Please select at least one day of the week.");
        return;
      }
    }

    if (!form.startTime || !form.endTime) {
      setError("Please provide start and end times.");
      return;
    }

    let payload;
    if (form.type === "one_time") {
      payload = {
        barber: form.barber,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason.trim(),
        active: form.active,
      };
    } else {
      payload = {
        scope: form.scope,
        barber: form.scope === "barber" ? form.barber : null,
        daysOfWeek: [...new Set(form.daysOfWeek)].sort(),
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason.trim(),
        active: form.active,
      };
      if (form.startDate) payload.startDate = form.startDate;
      if (form.endDate) payload.endDate = form.endDate;
    }

    try {
      setSubmitting(true);
      await onSubmit(payload, blockedTime?._id ?? blockedTime?.id, form.type);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save blocked time."
      );
    } finally {
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

      <div className="relative z-10 w-full max-w-xl border border-white/10 bg-[#141311] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5 sticky top-0 bg-[#141311] z-10">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              Business
            </div>

            <h2 className="mt-1 text-xl font-extrabold uppercase tracking-tight text-[#e8e2d6]">
              {isEditing ? "Edit Blocked Time" : "New Blocked Time"}
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

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs leading-relaxed text-red-400">
              {error}
            </div>
          )}

          {!isEditing && (
            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="one_time"
                    checked={form.type === "one_time"}
                    onChange={handleChange}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-[#e8e2d6]">One-time</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="recurring"
                    checked={form.type === "recurring"}
                    onChange={handleChange}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-[#e8e2d6]">Recurring</span>
                </label>
              </div>
              <p className="mt-2 text-xs text-[#8f897e]">
                {form.type === "one_time"
                  ? "Blocks this time on one specific date."
                  : "Blocks this time automatically on selected days."}
              </p>
            </div>
          )}

          {form.type === "recurring" && (
            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Scope
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="all_barbers"
                    checked={form.scope === "all_barbers"}
                    onChange={handleChange}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-[#e8e2d6]">All Barbers</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="barber"
                    checked={form.scope === "barber"}
                    onChange={handleChange}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-[#e8e2d6]">Specific Barber</span>
                </label>
              </div>
            </div>
          )}

          {(form.type === "one_time" || form.scope === "barber") && (
            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Barber
              </label>
              <select
                name="barber"
                value={form.barber}
                onChange={handleChange}
                required={form.type === "one_time" || form.scope === "barber"}
                className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors focus:border-amber-500"
              >
                <option value="" disabled>Select a barber</option>
                {barbers.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.type === "one_time" && (
            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Date
              </label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
          )}

          {form.type === "recurring" && (
            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((day, idx) => {
                  const isSelected = form.daysOfWeek.includes(idx);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                        isSelected 
                          ? "bg-amber-500 text-black border border-amber-500" 
                          : "bg-transparent text-[#8f897e] border border-white/10 hover:border-amber-500/50"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Start Time
              </label>
              <input
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={handleChange}
                required
                className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors focus:border-amber-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                End Time
              </label>
              <input
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={handleChange}
                required
                className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              Reason (Optional)
            </label>
            <input
              name="reason"
              value={form.reason}
              onChange={handleChange}
              maxLength={300}
              placeholder="E.g., Lunch break, Doctor appointment"
              className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500"
            />
          </div>

          {form.type === "recurring" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                  Start Date (Optional)
                </label>
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors focus:border-amber-500 [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                  End Date (Optional)
                </label>
                <input
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors focus:border-amber-500 [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 border border-white/10 px-4 py-3">
            <input
              name="active"
              type="checkbox"
              checked={form.active}
              onChange={handleChange}
              className="h-4 w-4 accent-amber-500"
            />
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e8e2d6]">
                Active
              </span>
              <span className="mt-0.5 block text-[9px] text-[#625f58]">
                Currently blocking time
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-5">
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
              {submitting
                ? "Saving..."
                : isEditing
                  ? "Update Block"
                  : "Create Block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockedTimeFormModal;
