import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import paymentLinkService from "../../service/paymentLink.service";
import PaymentLinkFormModal from "./PaymentLinkFormModal";

const navSections = [
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
            permission: "merchants.read",
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

const CURRENCY = "NGN";

function formatKoboAsNaira(kobo) {
  if (kobo === null || kobo === undefined) return "—";
  const n = Number(kobo);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(n / 100);
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatRelative(value) {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(value).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
  });
}

function publicUrlForSlug(slug) {
  const base =
    import.meta.env.VITE_PUBLIC_CHECKOUT_URL || window.location.origin;
  return `${base.replace(/\/$/, "")}/pay/${slug}`;
}

export default function PaymentLinksPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { businessProfile, roles } = useMerchantStore();

  const [state, setState] = useState({
    loading: true,
    error: null,
    links: [],
    meta: null,
  });

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    search: "",
  });

  const [copiedSlug, setCopiedSlug] = useState(null);
  const [modal, setModal] = useState({ open: false, linkId: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await paymentLinkService.list({
        page: filters.page,
        limit: filters.limit,
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      setState({
        loading: false,
        error: null,
        links: result.data || [],
        meta: result.meta || null,
      });
    } catch (error) {
      setState({
        loading: false,
        error:
          error?.response?.data?.message || "Failed to load payment links",
        links: [],
        meta: null,
      });
    }
  }, [filters.page, filters.limit, filters.status, filters.search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async (slug) => {
    const url = publicUrlForSlug(slug);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement("textarea");
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const handleArchive = async (link) => {
    if (
      !window.confirm(
        `Archive "${link.title}"? Customers will no longer be able to pay through this link.`
      )
    ) {
      return;
    }
    try {
      await paymentLinkService.archive(link.id);
      load();
    } catch (error) {
      window.alert(
        error?.response?.data?.message || "Failed to archive link"
      );
    }
  };

  const openCreateModal = () => setModal({ open: true, linkId: null });
  const openEditModal = (id) => setModal({ open: true, linkId: id });
  const closeModal = () => setModal({ open: false, linkId: null });

  const isFiltered = useMemo(
    () => Boolean(filters.status || filters.search),
    [filters.status, filters.search]
  );

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Merchant Admin"
    : "Merchant Admin";

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Payment Links"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles?.[0]?.name || "Member"}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ctex-text">
              Payment Links
            </h1>
            <p className="mt-1 text-sm text-ctex-text-muted">
              Share a link and get paid. No integration required.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light"
          >
            + Create payment link
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            placeholder="Search by title or slug"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
            }
            className="flex-1 rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 py-2 text-sm text-ctex-text outline-none focus:border-ctex-blue"
          />
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))
            }
            className="rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 py-2 text-sm text-ctex-text outline-none focus:border-ctex-blue"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* States */}
        {state.loading && (
          <div className="py-12 text-center text-sm text-ctex-text-muted">
            Loading payment links…
          </div>
        )}

        {!state.loading && state.error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
            <span className="flex-1">{state.error}</span>
            <button onClick={load} className="font-medium underline">
              Retry
            </button>
          </div>
        )}

        {!state.loading && !state.error && state.links.length === 0 && (
          <div className="rounded-xl border border-dashed border-ctex-border bg-ctex-surface p-12 text-center">
            <p className="text-base font-medium text-ctex-text">
              {isFiltered
                ? "No links match your filters"
                : "No payment links yet"}
            </p>
            <p className="mt-1 text-sm text-ctex-text-muted">
              {isFiltered
                ? "Try adjusting your search or filters."
                : "Create a link to start receiving bank transfer payments."}
            </p>
            {!isFiltered && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center rounded-xl bg-ctex-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-ctex-blue-light"
              >
                Create your first link
              </button>
            )}
          </div>
        )}

        {/* Table (desktop) */}
        {!state.loading && !state.error && state.links.length > 0 && (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-lg shadow-black/10 md:block">
              <table className="min-w-full divide-y divide-ctex-border">
                <thead className="bg-ctex-elevated/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ctex-text-muted">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ctex-text-muted">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ctex-text-muted">
                      Payments
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ctex-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ctex-text-muted">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ctex-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ctex-border">
                  {state.links.map((link) => (
                    <tr key={link.id} className="hover:bg-ctex-elevated/30">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-ctex-text">
                          {link.title}
                        </div>
                        <div className="mt-0.5 text-xs text-ctex-text-muted">
                          /pay/{link.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ctex-text">
                        {link.amountType === "CUSTOM"
                          ? "Customer enters"
                          : formatKoboAsNaira(link.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <PaymentsCell stats={link.paymentStats} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={link.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-ctex-text-muted">
                        {formatDate(link.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <RowActions
                          link={link}
                          onCopy={() => handleCopy(link.slug)}
                          copied={copiedSlug === link.slug}
                          onEdit={() => openEditModal(link.id)}
                          onArchive={() => handleArchive(link)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <div className="space-y-3 md:hidden">
              {state.links.map((link) => (
                <div
                  key={link.id}
                  className="rounded-2xl border border-ctex-border bg-ctex-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ctex-text">
                        {link.title}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ctex-text-muted">
                        /pay/{link.slug}
                      </div>
                    </div>
                    <StatusBadge status={link.status} />
                  </div>

                  <div className="mt-3">
                    <PaymentsCell stats={link.paymentStats} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-ctex-text-muted">
                    <span>
                      {link.amountType === "CUSTOM"
                        ? "Customer enters amount"
                        : formatKoboAsNaira(link.amount)}
                    </span>
                    <span>{formatDate(link.createdAt)}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleCopy(link.slug)}
                      className="flex-1 rounded-lg border border-ctex-border px-3 py-1.5 text-xs font-medium text-ctex-text-muted hover:text-ctex-blue"
                    >
                      {copiedSlug === link.slug ? "Copied!" : "Copy link"}
                    </button>
                    <button
                      onClick={() => openEditModal(link.id)}
                      className="flex-1 rounded-lg border border-ctex-border px-3 py-1.5 text-xs font-medium text-ctex-text-muted hover:text-ctex-blue"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleArchive(link)}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-500"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {state.meta && state.meta.totalPages > 1 && (
              <Pagination
                page={state.meta.page}
                totalPages={state.meta.totalPages}
                onChange={(p) => setFilters((f) => ({ ...f, page: p }))}
              />
            )}
          </>
        )}

        {/* Modal */}
        <PaymentLinkFormModal
          open={modal.open}
          linkId={modal.linkId}
          onClose={closeModal}
          onSuccess={load}
        />
      </div>
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Payments cell                                                      */
/* ------------------------------------------------------------------ */

function PaymentsCell({ stats }) {
  if (!stats || stats.total === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ctex-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-500/40" />
        No payments yet
      </span>
    );
  }

  const { total, successful, pending, hasSuccessfulPayment, lastPaymentAt } =
    stats;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {hasSuccessfulPayment ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {successful} paid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Awaiting payment
          </span>
        )}
        {pending > 0 ? (
          <span className="text-[11px] text-ctex-text-muted">
            {pending} pending
          </span>
        ) : null}
        {!hasSuccessfulPayment && pending === 0 && total > 0 ? (
          <span className="text-[11px] text-ctex-text-muted">
            {total} attempt{total === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {lastPaymentAt ? (
        <span className="text-[11px] text-ctex-text-muted">
          Last: {formatRelative(lastPaymentAt)}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Existing building blocks                                           */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const map = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500",
    INACTIVE: "bg-gray-500/10 text-gray-400",
    ARCHIVED: "bg-amber-500/10 text-amber-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        map[status] || "bg-ctex-border/40 text-ctex-text-muted"
      }`}
    >
      {status}
    </span>
  );
}

function RowActions({ link, onCopy, copied, onEdit, onArchive }) {
  const openPublic = () => {
    window.open(publicUrlForSlug(link.slug), "_blank", "noopener,noreferrer");
  };
  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={onCopy}
        className="rounded-lg px-2 py-1 text-xs font-medium text-ctex-blue hover:bg-ctex-blue/10"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        onClick={openPublic}
        className="rounded-lg px-2 py-1 text-xs font-medium text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text"
      >
        Open
      </button>
      <button
        onClick={onEdit}
        className="rounded-lg px-2 py-1 text-xs font-medium text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text"
      >
        Edit
      </button>
      {link.status !== "ARCHIVED" && (
        <button
          onClick={onArchive}
          className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
        >
          Archive
        </button>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-ctex-text-muted">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-ctex-border px-3 py-1 text-sm text-ctex-text-muted disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-ctex-border px-3 py-1 text-sm text-ctex-text-muted disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}