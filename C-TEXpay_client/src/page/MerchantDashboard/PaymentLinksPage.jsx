import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import paymentLinkService from "../../service/paymentLink.service";
import PaymentLinkFormModal from "./PaymentLinkFormModal";
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
const CURRENCY = "NGN";

/* --------------------------------------------------------------------------
   HELPERS
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   STATUS CHIP
   -------------------------------------------------------------------------- */
function statusTone(status) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "ARCHIVED":
      return "warning";
    case "INACTIVE":
      return "neutral";
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

/* --------------------------------------------------------------------------
   PAGE
   -------------------------------------------------------------------------- */
export default function PaymentLinksPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();

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
  const [confirmArchive, setConfirmArchive] = useState(null);

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

  const doArchive = async (link) => {
    try {
      await paymentLinkService.archive(link.id);
      setConfirmArchive(null);
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
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "Merchant Admin"
    : "Merchant Admin";

  const navSections = buildMerchantNav(permissions);

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Payment Links"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles?.[0]?.name || "Member"}
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
              Payment links
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              Share a link. Get paid.
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              No integration required. Send via WhatsApp, email, or anywhere.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
              <HeroPill icon={BadgeCheck}>
                <span className="capitalize">
                  {businessProfile?.businessName || "Workspace"}
                </span>
              </HeroPill>
              <HeroPill icon={Link2}>
                {state.meta?.total ?? state.links.length} link
                {(state.meta?.total ?? state.links.length) === 1 ? "" : "s"}
              </HeroPill>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0B3E66] transition hover:-translate-y-px hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              Create payment link
            </button>
          </div>
        </div>
      </motion.section>

      {/* ─── FILTERS ──────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex flex-1 items-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2.5 text-sm text-ctex-text-muted">
          <Search size={16} className="shrink-0" />
          <input
            type="search"
            placeholder="Search by title or slug"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
            }
            className="w-full bg-transparent text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() =>
                setFilters((f) => ({ ...f, search: "", page: 1 }))
              }
              className="rounded-full p-1 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))
          }
          className="rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2.5 text-sm text-ctex-text outline-none transition focus:border-ctex-accent sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* ─── STATES ──────────────────────────────────────────── */}
      {state.loading && (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[28px] bg-ctex-surface"
            />
          ))}
        </div>
      )}

      {!state.loading && state.error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          <span className="flex-1">{state.error}</span>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium transition hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      )}

      {!state.loading && !state.error && state.links.length === 0 && (
        <div className="mt-4 rounded-[28px] border border-dashed border-ctex-border bg-ctex-surface px-6 py-12 text-center sm:py-16">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={TONES.blue}
            >
              <Link2 className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <p className="text-sm font-semibold text-ctex-text">
              {isFiltered
                ? "No links match your filters"
                : "No payment links yet"}
            </p>
            <p className="text-xs text-ctex-text-muted">
              {isFiltered
                ? "Try adjusting your search or filters."
                : "Create a link to start receiving bank transfer payments."}
            </p>
            {!isFiltered && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-ctex-accent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first link
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── LIST ─────────────────────────────────────────────── */}
      {!state.loading && !state.error && state.links.length > 0 && (
        <>
          {/* Desktop table */}
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
                    <Th>Link</Th>
                    <Th>Amount</Th>
                    <Th>Payments</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {state.links.map((link) => (
                    <tr key={link.id} className="group">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                            style={TONES.blue}
                          >
                            <Link2 className="h-4 w-4" strokeWidth={2.2} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ctex-text">
                              {link.title}
                            </p>
                            <p className="truncate text-[11px] text-ctex-text-muted">
                              /pay/{link.slug}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-sm text-ctex-text">
                          {link.amountType === "CUSTOM"
                            ? "Customer enters"
                            : formatKoboAsNaira(link.amount)}
                        </span>
                      </Td>
                      <Td>
                        <PaymentsCell stats={link.paymentStats} />
                      </Td>
                      <Td>
                        <StatusChip status={link.status} />
                      </Td>
                      <Td>
                        <span className="whitespace-nowrap text-[11px] text-ctex-text-muted">
                          {formatDate(link.createdAt)}
                        </span>
                      </Td>
                      <Td align="right">
                        <RowActions
                          link={link}
                          onCopy={() => handleCopy(link.slug)}
                          copied={copiedSlug === link.slug}
                          onEdit={() => openEditModal(link.id)}
                          onArchive={() => setConfirmArchive(link)}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Mobile cards */}
          <div className="mt-4 grid gap-3 md:hidden">
            {state.links.map((link) => (
              <motion.div
                key={link.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] border border-ctex-border bg-ctex-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={TONES.blue}
                    >
                      <Link2 className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ctex-text">
                        {link.title}
                      </p>
                      <p className="truncate text-[11px] text-ctex-text-muted">
                        /pay/{link.slug}
                      </p>
                    </div>
                  </div>
                  <StatusChip status={link.status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-ctex-text-muted">
                  <div>
                    <p className="uppercase tracking-wide">Amount</p>
                    <p className="mt-0.5 text-sm font-medium text-ctex-text">
                      {link.amountType === "CUSTOM"
                        ? "Customer enters"
                        : formatKoboAsNaira(link.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide">Created</p>
                    <p className="mt-0.5 text-sm font-medium text-ctex-text">
                      {formatDate(link.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <PaymentsCell stats={link.paymentStats} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(link.slug)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedSlug === link.slug ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(link.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {link.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      onClick={() => setConfirmArchive(link)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Archive
                    </button>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text-muted opacity-60">
                      Archived
                    </span>
                  )}
                </div>
              </motion.div>
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

      {/* ─── MODAL ─────────────────────────────────────────────── */}
      <PaymentLinkFormModal
        open={modal.open}
        linkId={modal.linkId}
        onClose={closeModal}
        onSuccess={load}
      />

      {/* ─── ARCHIVE CONFIRM ───────────────────────────────────── */}
      <AnimatePresence>
        {confirmArchive && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setConfirmArchive(null);
            }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="w-full max-w-md overflow-hidden rounded-[24px] border border-ctex-border bg-ctex-surface shadow-2xl"
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                    style={TONES.oxblood}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-ctex-text">
                      Archive this link?
                    </h3>
                    <p className="mt-1 text-sm text-ctex-text-muted">
                      Customers will no longer be able to pay through{" "}
                      <strong className="text-ctex-text">
                        {confirmArchive.title}
                      </strong>
                      . Existing payments are unaffected.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-ctex-border bg-ctex-panel/40 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setConfirmArchive(null)}
                  className="rounded-full border border-ctex-border bg-ctex-surface px-4 py-2 text-sm font-medium text-ctex-text transition hover:bg-ctex-panel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => doArchive(confirmArchive)}
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  Archive link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

function PaymentsCell({ stats }) {
  if (!stats || stats.total === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ctex-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-ctex-text-muted/40" />
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
        {pending > 0 && (
          <span className="text-[11px] text-ctex-text-muted">
            {pending} pending
          </span>
        )}
        {!hasSuccessfulPayment && pending === 0 && total > 0 && (
          <span className="text-[11px] text-ctex-text-muted">
            {total} attempt{total === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {lastPaymentAt && (
        <span className="text-[11px] text-ctex-text-muted">
          Last: {formatRelative(lastPaymentAt)}
        </span>
      )}
    </div>
  );
}

function RowActions({ link, onCopy, copied, onEdit, onArchive }) {
  const openPublic = () => {
    window.open(publicUrlForSlug(link.slug), "_blank", "noopener,noreferrer");
  };
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-ctex-blue transition hover:bg-ctex-blue/10"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        onClick={openPublic}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      {link.status !== "ARCHIVED" && (
        <button
          type="button"
          onClick={onArchive}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Archive
        </button>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-[24px] border border-ctex-border bg-ctex-surface px-4 py-3 sm:flex-row">
      <span className="text-xs text-ctex-text-muted">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-40"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}