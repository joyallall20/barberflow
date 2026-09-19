import { useEffect, useState } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

const inputClass =
  "w-full border border-white/10 bg-transparent px-3 py-2 text-xs text-[#e8e2d6] outline-none transition-colors focus:border-amber-500";

const AppointmentFilters = ({
  filters,
  onChange,
  barbers = [],
  loading = false,
}) => {
  const [local, setLocal] = useState({
    from: filters?.from || "",
    to: filters?.to || "",
    barber: filters?.barber || "",
    status: filters?.status || "",
  });

  useEffect(() => {
    setLocal({
      from: filters?.from || "",
      to: filters?.to || "",
      barber: filters?.barber || "",
      status: filters?.status || "",
    });
  }, [
    filters?.from,
    filters?.to,
    filters?.barber,
    filters?.status,
  ]);

  const apply = () => {
    onChange({
      from: local.from || "",
      to: local.to || "",
      barber: local.barber || "",
      status: local.status || "",
    });
  };

  const clear = () => {
    const reset = {
      from: "",
      to: "",
      barber: "",
      status: "",
    };

    setLocal(reset);
    onChange(reset);
  };

  const safeBarbers = Array.isArray(barbers) ? barbers : [];

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 border border-white/10 p-5 sm:grid-cols-4 lg:grid-cols-5">
      {/* From */}
      <div>
        <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
          From
        </label>

        <input
          type="date"
          value={local.from}
          max={local.to || undefined}
          onChange={(e) =>
            setLocal((state) => ({
              ...state,
              from: e.target.value,
            }))
          }
          className={inputClass}
          disabled={loading}
        />
      </div>

      {/* To */}
      <div>
        <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
          To
        </label>

        <input
          type="date"
          value={local.to}
          min={local.from || undefined}
          onChange={(e) =>
            setLocal((state) => ({
              ...state,
              to: e.target.value,
            }))
          }
          className={inputClass}
          disabled={loading}
        />
      </div>

      {/* Barber */}
      <div>
        <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
          Barber
        </label>

        <select
          value={local.barber}
          onChange={(e) =>
            setLocal((state) => ({
              ...state,
              barber: e.target.value,
            }))
          }
          className={inputClass}
          disabled={loading}
        >
          <option value="">All barbers</option>

          {safeBarbers.map((barber) => {
            const id = barber?._id ?? barber?.id;

            return (
              <option key={id} value={id}>
                {barber?.name || "Unnamed barber"}
              </option>
            );
          })}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
          Status
        </label>

        <select
          value={local.status}
          onChange={(e) =>
            setLocal((state) => ({
              ...state,
              status: e.target.value,
            }))
          }
          className={inputClass}
          disabled={loading}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={loading}
          className="flex-1 border border-amber-500 bg-amber-500 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition-all hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>

        <button
          type="button"
          onClick={clear}
          disabled={loading}
          className="border border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8f897e] transition-colors hover:text-[#e8e2d6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default AppointmentFilters;