import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Copy,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useCustomerStore } from "../../store/customer.store";
import { hasPermission } from "../../utils/permissions";
import CustomerFormModal from "../../components/customers/CustomerFormModal";
import DeleteConfirmModal from "../../components/customers/DeleteConfirmModal";
import { buildMerchantNav } from "./merchantNav";

/* --------------------------------------------------------------------------
   BRAND TONES (shared with MerchantDashboard)
   -------------------------------------------------------------------------- */
const TONES = {
  blue: {
    background: "linear-gradient(135deg,#2f95de,#0B68AD)",
    boxShadow: "0 10px 22px -10px #0B68AD",
  },
  green: {
    background: "linear-gradient(135deg,#22C55E,#15803D)",
    boxShadow: "0 10px 22px -10px #15803D",
  },
  orange: {
    background: "linear-gradient(135deg,#FBBF24,#EA580C)",
    boxShadow: "0 10px 22px -10px #EA580C",
  },
  oxblood: {
    background: "linear-gradient(135deg,#9F1239,#4C0519)",
    boxShadow: "0 10px 22px -10px #7F1D1D",
  },
};

const HERO_BG = "linear-gradient(160deg,#2f95de 0%,#0B68AD 100%)";

/* --------------------------------------------------------------------------
   OPTIONS
   -------------------------------------------------------------------------- */
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "BLOCKED", label: "Blocked" },
];

const LIMIT_OPTIONS = [10, 20, 50];

/* --------------------------------------------------------------------------
   HELPERS
   -------------------------------------------------------------------------- */
function formatDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusTone(status) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "warning";
    case "BLOCKED":
      return "danger";
    default:
      return "neutral";
  }
}

function toneClasses(tone) {
  switch (tone) {
    case "success":
      return "bg-emerald-500/10 text-emerald-500";
    case "warning":
      return "bg-amber-500/10 text-amber-500";
    case "danger":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-ctex-border/40 text-ctex-text-muted";
  }
}

function dotClass(tone) {
  switch (tone) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "danger":
      return "bg-red-500";
    default:
      return "bg-ctex-text-muted";
  }
}

function buildPageNumbers(current, total) {
  const out = [];
  const window = 1;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) out.push(i);
    return out;
  }

  out.push(1);
  if (current - window > 2) out.push("…");

  const start = Math.max(2, current - window);
  const end = Math.min(total - 1, current + window);

  for (let i = start; i <= end; i++) out.push(i);

  if (current + window < total - 1) out.push("…");
  out.push(total);

  return out;
}

/* --------------------------------------------------------------------------
   PAGE
   -------------------------------------------------------------------------- */
export default function CustomersPage() {
  const { user } = useAuthStore();
  const {
    roles,
    permissions,
    businessProfile,
    getMyMerchant,
    getMyMembership,
  } = useMerchantStore();

  const {
    customers,
    pagination,
    isLoading,
    error,
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    clearError,
  } = useCustomerStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  /* Bootstrap */
  useEffect(() => {
    if (!businessProfile) getMyMerchant();
    if (!permissions || permissions.length === 0) getMyMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fetch (debounced) */
  useEffect(() => {
    const handle = setTimeout(() => {
      getCustomers({
        page,
        limit,
        search,
        status: statusFilter || undefined,
      });
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, statusFilter]);

  const navSections = useMemo(
    () => buildMerchantNav(permissions),
    [permissions]
  );

  const canCreate = hasPermission(permissions, "customers.create");
  const canUpdate = hasPermission(permissions, "customers.update");
  const canDelete = hasPermission(permissions, "customers.delete");

  /* Handlers */
  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
    clearError();
  };

  const handleEdit = (customer) => {
    setEditing(customer);
    setFormOpen(true);
    clearError();
  };

  const handleFormSubmit = async (payload) => {
    if (editing) {
      const res = await updateCustomer(editing.id, payload);
      if (res.success) {
        setFormOpen(false);
        setEditing(null);
      }
      return res;
    }
    const res = await createCustomer(payload);
    if (res.success) setFormOpen(false);
    return res;
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    const res = await deleteCustomer(deleting.id);
    if (res.success) {
      setDeleting(null);
      if (customers.length === 1 && page > 1) setPage((p) => p - 1);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  const handleCopyEmail = async (email, id) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      window.prompt("Copy email:", email);
    }
  };

  const totalPages = pagination?.pages || 1;
  const total = pagination?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const isFiltered = Boolean(search || statusFilter);

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "Merchant Admin"
    : "Merchant Admin";

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Customers"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles?.[0]?.name}
    >
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[28px] p-5 text-white sm:p-6 lg:p-8"
        style={{ background: HERO_BG }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/70 sm:text-[11px]">
              Customers
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              {total.toLocaleString()} customer{total === 1 ? "" : "s"}
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Manage the customers linked to your merchant account.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
              <HeroPill icon={BadgeCheck}>
                <span className="capitalize">
                  {businessProfile?.businessName || "Workspace"}
                </span>
              </HeroPill>
              {isFiltered && (
                <HeroPill icon={Search}>
                  Filters active
                </HeroPill>
              )}
            </div>
          </div>

          {canCreate && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0B3E66] transition hover:-translate-y-px hover:bg-white/90"
              >
                <Plus className="h-4 w-4" />
                Add customer
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ─── FILTERS ──────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex flex-1 items-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2.5 text-sm text-ctex-text-muted">
          <Search size={16} className="shrink-0" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-transparent text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="rounded-full p-1 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={[
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                statusFilter === opt.value
                  ? "border-ctex-accent bg-ctex-accent/10 text-ctex-accent"
                  : "border-ctex-border bg-ctex-surface text-ctex-text-muted hover:border-ctex-accent/40 hover:text-ctex-accent",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-medium text-ctex-text-muted transition hover:text-ctex-accent hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── ERROR ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LOADING SKELETONS ─────────────────────────────────── */}
      {isLoading && customers.length === 0 && (
        <div className="mt-4 grid gap-3 md:hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[24px] bg-ctex-surface"
            />
          ))}
        </div>
      )}

      {/* ─── EMPTY ──────────────────────────────────────────────── */}
      {!isLoading && customers.length === 0 && (
        <div className="mt-4 rounded-[28px] border border-dashed border-ctex-border bg-ctex-surface px-6 py-12 text-center sm:py-16">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={TONES.orange}
            >
              <Users className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <p className="text-sm font-semibold text-ctex-text">
              {isFiltered ? "No customers match your filters" : "No customers yet"}
            </p>
            <p className="text-xs text-ctex-text-muted">
              {isFiltered
                ? "Try adjusting your search or filters."
                : "Add your first customer to get started."}
            </p>
            {canCreate && !isFiltered && (
              <button
                type="button"
                onClick={handleCreate}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-ctex-accent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                Add customer
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── TABLE (desktop) ──────────────────────────────────── */}
      {!isLoading && customers.length > 0 && (
        <>
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="mt-4 hidden overflow-hidden rounded-[28px] border border-ctex-border bg-ctex-surface md:block"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="text-xs text-ctex-text-muted">
                  <tr>
                    <Th>Customer</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {customers.map((customer) => (
                      <motion.tr
                        key={customer.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar
                              firstName={customer.firstName}
                              lastName={customer.lastName}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ctex-text">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <p className="truncate text-[11px] text-ctex-text-muted">
                                {customer.id.slice(0, 8)}…
                              </p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyEmail(customer.email, customer.id)
                            }
                            className="inline-flex items-center gap-1.5 text-sm text-ctex-text transition hover:text-ctex-accent"
                          >
                            <Mail className="h-3.5 w-3.5 text-ctex-text-muted" />
                            <span className="truncate">{customer.email}</span>
                            <Copy
                              className={[
                                "h-3 w-3 opacity-0 transition group-hover:opacity-60",
                                copiedId === customer.id
                                  ? "!opacity-100 text-emerald-500"
                                  : "",
                              ].join(" ")}
                            />
                          </button>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5 text-sm text-ctex-text-muted">
                            <Phone className="h-3.5 w-3.5" />
                            {customer.phone || "—"}
                          </span>
                        </Td>
                        <Td>
                          <StatusChip status={customer.status} />
                        </Td>
                        <Td>
                          <span className="whitespace-nowrap text-[11px] text-ctex-text-muted">
                            {formatDate(customer.createdAt)}
                          </span>
                        </Td>
                        <Td align="right">
                          <div className="inline-flex items-center gap-1">
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => handleEdit(customer)}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-accent"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleting(customer)}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                            {!canUpdate && !canDelete && (
                              <span className="text-xs text-ctex-text-muted">
                                —
                              </span>
                            )}
                          </div>
                        </Td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* ─── CARDS (mobile) ──────────────────────────────── */}
          <div className="mt-4 grid gap-3 md:hidden">
            {customers.map((customer) => (
              <motion.div
                key={customer.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] border border-ctex-border bg-ctex-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    firstName={customer.firstName}
                    lastName={customer.lastName}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ctex-text">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="truncate text-[11px] text-ctex-text-muted">
                      {customer.id.slice(0, 8)}…
                    </p>
                  </div>
                  <StatusChip status={customer.status} />
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-ctex-text-muted">
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(customer.email, customer.id)}
                    className="flex w-full items-center gap-2 truncate text-left transition hover:text-ctex-accent"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                    <Copy
                      className={[
                        "ml-auto h-3 w-3 shrink-0",
                        copiedId === customer.id
                          ? "text-emerald-500 opacity-100"
                          : "opacity-40",
                      ].join(" ")}
                    />
                  </button>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{customer.phone || "—"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wide">
                      Created
                    </span>
                    <span className="truncate">
                      {formatDate(customer.createdAt)}
                    </span>
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => handleEdit(customer)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleting(customer)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ─── PAGINATION ──────────────────────────────────── */}
          {total > 0 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-[24px] border border-ctex-border bg-ctex-surface px-4 py-3 sm:flex-row">
              <div className="flex flex-wrap items-center gap-3 text-xs text-ctex-text-muted">
                <span>
                  Showing{" "}
                  <strong className="text-ctex-text">
                    {start}–{end}
                  </strong>{" "}
                  of <strong className="text-ctex-text">{total}</strong>
                </span>

                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-full border border-ctex-border bg-ctex-surface px-3 py-1 text-xs text-ctex-text outline-none transition focus:border-ctex-accent"
                >
                  {LIMIT_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v} / page
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <PaginationButton
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </PaginationButton>

                <div className="flex items-center gap-1">
                  {buildPageNumbers(page, totalPages).map((p, idx) =>
                    p === "…" ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1 text-xs text-ctex-text-muted"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={[
                          "min-w-8 rounded-full px-2.5 py-1 text-xs font-medium transition",
                          p === page
                            ? "bg-ctex-accent text-white"
                            : "text-ctex-text-muted hover:bg-ctex-panel hover:text-ctex-text",
                        ].join(" ")}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <PaginationButton
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </PaginationButton>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MODALS ────────────────────────────────────────────── */}
      <CustomerFormModal
        open={formOpen}
        customer={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          clearError();
        }}
        onSubmit={handleFormSubmit}
        isSaving={isLoading}
      />

      <DeleteConfirmModal
        open={!!deleting}
        title="Delete customer"
        description={
          deleting
            ? `Are you sure you want to delete ${deleting.firstName} ${deleting.lastName}? This action cannot be undone.`
            : ""
        }
        onCancel={() => setDeleting(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isLoading}
      />
    </DashboardLayout>
  );
}

/* --------------------------------------------------------------------------
   SUB-COMPONENTS
   -------------------------------------------------------------------------- */

function HeroPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-white/80" />
      {children}
    </span>
  );
}

function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClasses(tone),
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass(tone)}`} />
      {status}
    </span>
  );
}

function Avatar({ firstName = "", lastName = "" }) {
  const initials =
    (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || "?";

  const colors = [
    "bg-blue-500/15 text-blue-500",
    "bg-emerald-500/15 text-emerald-500",
    "bg-purple-500/15 text-purple-500",
    "bg-amber-500/15 text-amber-500",
    "bg-pink-500/15 text-pink-500",
    "bg-cyan-500/15 text-cyan-500",
  ];
  const idx =
    initials.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;

  return (
    <span
      className={[
        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        colors[idx],
      ].join(" ")}
    >
      {initials}
    </span>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      scope="col"
      className={[
        "whitespace-nowrap bg-ctex-panel px-5 py-3 font-medium first:rounded-l-xl last:rounded-r-xl",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td
      className={[
        "border-b border-ctex-border px-5 py-3.5 text-sm transition group-hover:bg-ctex-panel/60",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

function PaginationButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ctex-surface"
    >
      {children}
    </button>
  );
}