import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  getAdminServices,
  createService,
  updateService,
  deleteService,
} from "../../services/admin.js";

import ServiceFormModal from "../../admin/components/ServiceFormModal.jsx";

const EASE = [0.22, 1, 0.36, 1];

const ServicesPage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formTarget, setFormTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAdminServices();

      const list = data?.data ?? [];

      const sorted = [...list].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );

      setServices(sorted);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something prevented the service catalog from loading."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSubmit = async (values, id) => {
    const label = id ? "Service updated" : "Service created";

    try {
      if (id) {
        await updateService(id, values);
      } else {
        await createService(values);
      }

      toast.success(label);
      setFormTarget(null);
      await fetchServices();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        `Failed to ${id ? "update" : "create"} service.`;

      toast.error(message);
      throw err;
    }
  };

  const handleToggleActive = async (service) => {
    const id = service._id ?? service.id;

    try {
      await updateService(id, {
        active: !service.active,
      });

      toast.success(
        service.active
          ? "Service deactivated"
          : "Service activated"
      );

      await fetchServices();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to update service."
      );
    }
  };

  const handleDelete = async (service) => {
    const id = service._id ?? service.id;

    try {
      await deleteService(id);

      toast.success("Service deleted");
      setDeleteTarget(null);
      await fetchServices();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to delete service. It may be referenced by existing appointments."
      );
    }
  };

  return (
    <div>
      <motion.div
        initial={
          prefersReducedMotion
            ? false
            : { opacity: 0, y: 14 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Business
          </div>

          <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
            Services
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#a89f8f]">
            Manage the services, pricing and booking durations
            offered at The Foundry.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchServices}
            disabled={loading}
            className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setFormTarget({})}
            className="flex items-center gap-2 border border-amber-500 bg-amber-500 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition-all hover:bg-transparent hover:text-amber-500"
          >
            <Plus size={13} />
            New Service
          </button>
        </div>
      </motion.div>

      <div className="mt-8 border border-dashed border-white/15 px-6 py-16 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
        {loading
          ? "Loading…"
          : error
            ? error
            : services.length
              ? `${services.length} service(s) — table pending`
              : "No services yet"}
      </div>

      {formTarget !== null && (
        <ServiceFormModal
          service={
            formTarget?._id || formTarget?.id
              ? formTarget
              : null
          }
          onClose={() => setFormTarget(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default ServicesPage;