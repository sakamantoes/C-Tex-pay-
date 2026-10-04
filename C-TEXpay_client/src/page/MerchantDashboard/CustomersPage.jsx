import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useCustomerStore } from "../../store/customer.store";
import { hasPermission } from "../../utils/permissions";
import CustomerFormModal from "../../components/customers/CustomerFormModal";
import DeleteConfirmModal from "../../components/customers/DeleteConfirmModal";

/*
|--------------------------------------------------------------------------
| NAV
|--------------------------------------------------------------------------
*/
const buildNav = () => [
  {
    title: "Overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "dashboard",
        path: "/merchant/dashboard",
      },
      {
        key: "payments",
        label: "Payments",
        icon: "payments",
        children: [
          {
            key: "transactions",
            label: "Transactions",
            path: "/merchant/dashboard/transactions",
            permission: "transactions.read",
          },
          {
            key: "payment-links",
            label: "Payment Links",
            path: "/merchant/dashboard/payment-links",
            permission: "payment_links.read",
          },
          {
            key: "customers",
            label: "Customers",
            path: "/merchant/dashboard/customers",
            permission: "customers.read",
          },
        ],
      },
      {
        key: "business",
        label: "Business",
        icon: "business",
        children: [
          {
            key: "business-profile",
            label: "Business Profile",
            path: "/merchant/dashboard/business",
            permission: "business.read",
          },
          {
            key: "team-members",
            label: "Team Members",
            path: "/merchant/dashboard/team",
            permission: "team.read",
          },
          {
            key: "roles-permissions",
            label: "Roles & Permissions",
            path: "/merchant/dashboard/roles",
            permission: "roles.read",
          },
        ],
      },
    ],
  },
];

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "BLOCKED", label: "Blocked" },
];

const LIMIT_OPTIONS = [10, 20, 50];

export default function CustomersPage() {
  const { user } = useAuthStore();

  // ✅ FIX: pull `permissions` out of the store
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

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Bootstrap merchant + membership (works on direct visit / refresh)
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (!businessProfile) getMyMerchant();
    if (!permissions || permissions.length === 0) getMyMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Fetch customers (debounced search)
  |--------------------------------------------------------------------------
  */
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

  const navSections = useMemo(() => buildNav(), []);

  const canCreate = hasPermission(permissions, "customers.create");
  const canUpdate = hasPermission(permissions, "customers.update");
  const canDelete = hasPermission(permissions, "customers.delete");

  /*
  |--------------------------------------------------------------------------
  | Handlers
  |--------------------------------------------------------------------------
  */
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

    // Backend returns the freshly created customer; store prepends it.
    // No need to refetch — but if you want to be safe, uncomment below.
    const res = await createCustomer(payload);
    if (res.success) {
      setFormOpen(false);
      // getCustomers({ page, limit, search, status: statusFilter || undefined });
    }
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

  const totalPages = pagination?.pages || 1;

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Customers"
      navSections={navSections}
      profileName={
        user ? `${user.firstName} ${user.lastName}`.trim() : "Merchant Admin"
      }
      profileRole={roles?.[0]?.name}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ctex-text">Customers</h1>
          <p className="mt-1 text-sm text-ctex-text-muted">
            Manage the customers linked to your merchant account.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light"
          >
            <PlusIcon className="h-4 w-4" />
            Add customer
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-ctex-border bg-ctex-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ctex-text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 pl-9 pr-3 text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
          />
        </div>

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
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                statusFilter === opt.value
                  ? "border-ctex-blue bg-ctex-blue/10 text-ctex-blue"
                  : "border-ctex-border bg-ctex-elevated/60 text-ctex-text-muted hover:border-ctex-blue/40 hover:text-ctex-blue",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}

          {(search || statusFilter) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-medium text-ctex-text-muted hover:text-ctex-blue hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ctex-border">
            <thead className="bg-ctex-elevated/60">
              <tr>
                <Th>Customer</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ctex-border">
              {isLoading && customers.length === 0 && (
                <SkeletonRows rows={5} cols={6} />
              )}

              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ctex-elevated text-ctex-text-muted">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-ctex-text">
                        No customers yet
                      </p>
                      <p className="text-xs text-ctex-text-muted">
                        {search || statusFilter
                          ? "No customers match your filters. Try resetting them."
                          : "Add your first customer to get started."}
                      </p>
                      {canCreate && !search && !statusFilter && (
                        <button
                          type="button"
                          onClick={handleCreate}
                          className="mt-1 text-xs font-medium text-ctex-blue hover:underline"
                        >
                          Add customer →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              <AnimatePresence initial={false}>
                {customers.map((customer) => (
                  <motion.tr
                    key={customer.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="transition-colors hover:bg-ctex-elevated/40"
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
                          <p className="truncate text-xs text-ctex-text-muted">
                            {customer.id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-sm text-ctex-text">
                        {customer.email}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm text-ctex-text-muted">
                        {customer.phone || "—"}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={customer.status} />
                    </Td>
                    <Td>
                      <span className="text-xs text-ctex-text-muted">
                        {formatDate(customer.createdAt)}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => handleEdit(customer)}
                            className="rounded-lg p-2 text-ctex-text-muted transition hover:bg-ctex-elevated hover:text-ctex-blue"
                            aria-label="Edit"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleting(customer)}
                            className="rounded-lg p-2 text-ctex-text-muted transition hover:bg-red-500/10 hover:text-red-500"
                            aria-label="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
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

        {/* Pagination */}
        {(pagination?.total ?? 0) > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-ctex-border px-4 py-3 sm:flex-row">
            <div className="flex items-center gap-3 text-xs text-ctex-text-muted">
              <span>
                Showing{" "}
                <strong className="text-ctex-text">
                  {(page - 1) * limit + 1}–
                  {Math.min(page * limit, pagination?.total ?? 0)}
                </strong>{" "}
                of{" "}
                <strong className="text-ctex-text">
                  {pagination?.total ?? 0}
                </strong>
              </span>

              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-ctex-border bg-ctex-elevated/60 px-2 py-1 text-xs text-ctex-text outline-none focus:border-ctex-blue"
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

              {buildPageNumbers(page, totalPages).map((p, idx) =>
                p === "…" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-xs text-ctex-text-muted"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={[
                      "min-w-8 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                      p === page
                        ? "bg-ctex-blue text-white"
                        : "text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text",
                    ].join(" ")}
                  >
                    {p}
                  </button>
                )
              )}

              <PaginationButton
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </PaginationButton>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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

/* -------------------------------------------------------------------------- */
/* Small components + helpers + icons (unchanged)                              */
/* -------------------------------------------------------------------------- */

function Th({ children, align = "left" }) {
  return (
    <th
      className={[
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ctex-text-muted",
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
        "px-4 py-3",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
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

function StatusBadge({ status }) {
  const tone =
    {
      ACTIVE: "bg-emerald-500/10 text-emerald-500",
      INACTIVE: "bg-amber-500/10 text-amber-500",
      BLOCKED: "bg-red-500/10 text-red-500",
    }[status] || "bg-ctex-border/40 text-ctex-text-muted";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function PaginationButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg px-2.5 py-1 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-elevated hover:text-ctex-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function SkeletonRows({ rows, cols }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-4">
              <div className="h-4 w-full animate-pulse rounded bg-ctex-elevated" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

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

/* Icons */
function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function EditIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}