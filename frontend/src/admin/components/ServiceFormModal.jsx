import { useEffect, useState } from "react";
import { X } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  duration: "",
  sortOrder: "0",
  active: true,
};

const ServiceFormModal = ({ service, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(service);

  useEffect(() => {
    if (!service) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: service.name ?? "",
      description: service.description ?? "",
      price: service.price ?? "",
      duration: service.duration ?? "",
      sortOrder: service.sortOrder ?? 0,
      active: service.active ?? true,
    });
  }, [service]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);
    const duration = Number(form.duration);
    const sortOrder = Number(form.sortOrder);

    if (name.length < 2) {
      setError("Service name must be at least 2 characters.");
      return;
    }

    if (!Number.isFinite(price) || price < 0 || price > 10000) {
      setError("Price must be between 0 and 10,000.");
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration < 5 ||
      duration > 600
    ) {
      setError("Duration must be a whole number between 5 and 600 minutes.");
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setError("Sort order must be a whole number of 0 or greater.");
      return;
    }

    const payload = {
      name,
      description,
      price,
      duration,
      active: form.active,
      sortOrder,
    };

    try {
      setSubmitting(true);
      await onSubmit(payload, service?._id ?? service?.id);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save service."
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

      <div className="relative z-10 w-full max-w-xl border border-white/10 bg-[#141311] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              Business
            </div>

            <h2 className="mt-1 text-xl font-extrabold uppercase tracking-tight text-[#e8e2d6]">
              {isEditing ? "Edit Service" : "New Service"}
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

          <div>
            <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={120}
              required
              placeholder="Signature Cut"
              className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={2000}
              rows={3}
              placeholder="Classic cut, consultation and finish."
              className="w-full resize-none border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Price
              </label>
              <input
                name="price"
                type="number"
                min="0"
                max="10000"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
                placeholder="45"
                className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Duration
              </label>
              <input
                name="duration"
                type="number"
                min="5"
                max="600"
                step="1"
                value={form.duration}
                onChange={handleChange}
                required
                placeholder="30"
                className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none focus:border-amber-500"
              />
              <span className="mt-1 block text-[9px] text-[#625f58]">
                Minutes
              </span>
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
                Sort Order
              </label>
              <input
                name="sortOrder"
                type="number"
                min="0"
                step="1"
                value={form.sortOrder}
                onChange={handleChange}
                className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none focus:border-amber-500"
              />
            </div>
          </div>

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
                Available for public booking
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
                  ? "Update Service"
                  : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceFormModal;