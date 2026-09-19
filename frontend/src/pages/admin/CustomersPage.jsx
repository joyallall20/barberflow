import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { getAdminCustomers } from "../../services/admin.js";

const EASE = [0.22, 1, 0.36, 1];

const CustomersPage = () => {
  const prefersReducedMotion = useReducedMotion();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAdminCustomers({ search, page, limit });
      setCustomers(data?.data?.customers ?? data?.customers ?? []);
      setTotal(data?.data?.total ?? data?.total ?? 0);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something prevented the customers list from loading."
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Business
          </div>

          <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-4xl">
            Clients
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#a89f8f]">
            Manage your customer database and view their preferences.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </motion.div>

      <div className="mt-8">
        <form onSubmit={handleSearchSubmit} className="mb-6 flex max-w-md gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#625f58]">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-white/10 bg-[#0f0e0d] py-3 pl-10 pr-4 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="border border-white/10 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
          >
            Search
          </button>
        </form>

        {error ? (
          <div className="border border-dashed border-white/15 px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-[#625f58]">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-px border border-white/10 bg-white/5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-[#141311]" />
            ))}
          </div>
        ) : !customers.length ? (
          <div className="border border-white/10 px-6 py-16 text-center">
            <div className="text-sm font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
              No Clients Found
            </div>
            <p className="mt-2 text-xs text-[#8f897e]">
              Try adjusting your search criteria.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.2em] text-[#625f58]">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((item, i) => (
                    <motion.tr
                      key={item._id ?? item.id ?? i}
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="border-b border-white/10 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-4 font-semibold text-[#e8e2d6]">
                        {item.name}
                      </td>
                      <td className="px-4 py-4 text-[#a89f8f]">
                        {item.email}
                      </td>
                      <td className="px-4 py-4 text-[#a89f8f]">
                        {item.phone || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] ${item.active ? "text-amber-500" : "text-[#625f58]"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-amber-500" : "bg-[#625f58]"}`} />
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#8f897e]">
              <span>
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="flex px-4 py-2 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="flex px-4 py-2 items-center justify-center border border-white/10 text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
