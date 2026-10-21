import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const LIMIT = 25;

const money = (value) =>
  value == null
    ? "Not recorded"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
      }).format(Number(value) / 100);

function renderSettlement(
  amount,
  kind,
  reportedFallback,
  missingReason,
  expectedAmount
) {
  if (amount != null) {
    return {
      label: money(amount),
      tone: kind === "ACTUAL" ? "confirmed" : "info",
    };
  }
  if (kind === "PROVIDER_REPORTED" && reportedFallback != null) {
    return {
      label: `Awaiting bank (reported ${money(reportedFallback)})`,
      tone: "pending",
    };
  }
  if (kind === "EXPECTED_ONLY") {
    return {
      label: `Awaiting provider (expected ${money(expectedAmount)})`,
      tone: "pending",
    };
  }
  if (kind === "DISCREPANCY") {
    return { label: "Discrepancy", tone: "danger" };
  }
  return { label: missingReason || "Unknown", tone: "muted" };
}

const toneClasses = {
  confirmed: "text-emerald-500",
  info: "text-ctex-blue",
  pending: "text-amber-500",
  danger: "text-red-500",
  muted: "text-ctex-text-muted",
};

// Everything except an already CONFIRMED row can be reconciled.
// (UNAVAILABLE rows are included: that is where actual data is missing.)
const canReconcile = (row) => row.settlementStatus !== "CONFIRMED";

const getMerchantName = (row) => {
  const pay = row.payment || {};
  return (
    pay.merchant?.businessProfile?.businessName ||
    pay.merchant?.merchantCode ||
    pay.merchantId ||
    "Unknown merchant"
  );
};

export default function PlatformFinancialsPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: LIMIT,
    totalItems: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({});
  const [form, setForm] = useState({
    dateFrom: "",
    dateTo: "",
    provider: "",
    settlementStatus: "",
    merchantId: "",
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selection for bulk reconciliation
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("single"); // "single" | "bulk"
  const [modalTargets, setModalTargets] = useState([]); // rows

  const navSections = useMemo(
    () => [
      {
        title: "Platform",
        items: [
          { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/super-admin/dashboard" },
          { key: "merchants", label: "Merchants", icon: "business", path: "/super-admin/merchants" },
          { key: "transactions", label: "Transactions", icon: "transactions", path: "/super-admin/transactions" },
          { key: "financials", label: "Financial breakdown", icon: "fees", path: "/super-admin/financials" },
          { key: "withdrawal-fees", label: "Withdrawal charges", icon: "fees", path: "/super-admin/withdrawal-fees" },
          { key: "fees", label: "Payment fee configuration", icon: "fees", path: "/super-admin/fees" },
          { key: "audit-logs", label: "Audit logs", icon: "security", path: "/super-admin/audit-logs" },
        ],
      },
    ],
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT, ...filters };
      const [nextSummary, nextRecords] = await Promise.all([
        platformAdminService.getFinancialSummary(filters),
        platformAdminService.getFinancialPayments(params),
      ]);
      setSummary(nextSummary);
      setRecords(nextRecords.data || []);
      setPagination(
        nextRecords.pagination || {
          page,
          limit: LIMIT,
          totalItems: 0,
          totalPages: 0,
        }
      );
      // Clear selection on reload
      setSelectedIds(new Set());
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not load financial reports."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = {};
    if (form.dateFrom)
      next.dateFrom = new Date(`${form.dateFrom}T00:00:00`).toISOString();
    if (form.dateTo)
      next.dateTo = new Date(
        `${form.dateTo}T23:59:59.999`
      ).toISOString();
    if (form.provider) next.provider = form.provider;
    if (form.settlementStatus)
      next.settlementStatus = form.settlementStatus;
    if (form.merchantId.trim())
      next.merchantId = form.merchantId.trim();
    setPage(1);
    setFilters(next);
  };

  /* --------------------------------------------------------------
   * Selection helpers (only reconcilable rows can be selected)
   * ------------------------------------------------------------ */
  const selectableRows = useMemo(
    () => records.filter(canReconcile),
    [records]
  );

  const allSelected =
    selectableRows.length > 0 && selectedIds.size === selectableRows.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableRows.map((r) => r.id)));
    }
  };

  /* --------------------------------------------------------------
   * Modal openers
   * ------------------------------------------------------------ */
  const openSingleReconcile = (row) => {
    setModalMode("single");
    setModalTargets([row]);
    setModalOpen(true);
  };

  const openBulkReconcile = () => {
    if (selectedIds.size === 0) return;
    const targets = records.filter(
      (r) => selectedIds.has(r.id) && canReconcile(r)
    );
    if (targets.length === 0) return;
    setModalMode("bulk");
    setModalTargets(targets);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalTargets([]);
  };

  const onReconcileSuccess = async () => {
    closeModal();
    await load();
  };

  const p = summary?.payments || {};
  const w = summary?.withdrawals || {};

  const cards = [
    { label: "Successful payment volume", value: p.grossVolume, available: true },
    {
      label: "Confirmed provider charges",
      value: p.confirmedProviderCharges,
      available: p.confirmedProviderChargesAvailable,
    },
    {
      label: "Estimated provider charges",
      value: p.estimatedProviderCharges,
      available: p.estimatedProviderChargesAvailable,
    },
    {
      label: "Provider-reported charges",
      value: p.providerReportedCharges,
      available: p.providerReportedChargesAvailable,
    },
    { label: "C-TEX payment service fees", value: p.ctexServiceFeeRevenue, available: true },
    { label: "Merchant net payable", value: p.merchantNetPayable, available: true },
    {
      label: "Actual provider settlements",
      value: p.actualProviderSettlements,
      available: p.actualProviderSettlementsAvailable,
    },
    {
      label: "Confirmed gross processing margin",
      value: p.ctexGrossProcessingMargin,
      available: p.ctexGrossProcessingMarginAvailable,
    },
    {
      label: "Estimated gross processing margin",
      value: p.estimatedCtexGrossProcessingMargin,
      available: p.estimatedCtexGrossProcessingMarginAvailable,
    },
    {
      label: "Pending expected settlements",
      value: p.pendingExpectedSettlement,
      available: p.pendingExpectedSettlementAvailable,
    },
    { label: "Successful withdrawal volume", value: w.successfulPayoutAmount, available: true },
    { label: "Withdrawal charges collected", value: w.ctexWithdrawalChargesCollected, available: true },
  ];

  return (
    <DashboardLayout
      title="Super Admin"
      subtitle="Financial breakdown"
      navSections={navSections}
      profileName={
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        "Super Admin"
      }
      profileRole={user?.role}
    >
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-ctex-text">
          Successful payment financials
        </h2>
        <p className="mt-1 text-sm text-ctex-text-muted">
          {summary?.scope || "Provider-confirmed successful payments only"}.
          Estimated provider costs and settlements are labeled separately.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, available }) => (
          <div
            key={label}
            className="rounded-xl border border-ctex-border bg-ctex-surface p-4"
          >
            <p className="text-xs text-ctex-text-muted">{label}</p>
            <p className="mt-2 text-lg font-semibold text-ctex-text">
              {loading && value === undefined
                ? "Loading…"
                : available === false
                ? "Not yet recorded"
                : money(value)}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ctex-border bg-ctex-surface p-4">
          <p className="text-sm text-ctex-text-muted">
            Settlement discrepancies
          </p>
          <p className="mt-1 text-xl font-semibold text-ctex-text">
            {Number(p.settlementDiscrepancyCount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-ctex-text-muted">
            Difference: {money(p.settlementDiscrepancyAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-ctex-text-muted">
          Gross processing margin is before operating costs, taxes, refunds,
          chargebacks, payout costs, and other expenses. Provider-reported
          amounts are not represented as bank-settled cash.
        </div>
      </section>

      <form
        onSubmit={applyFilters}
        className="my-5 grid gap-3 rounded-xl border border-ctex-border bg-ctex-surface p-4 sm:grid-cols-2 xl:grid-cols-6"
      >
        <label className="text-xs text-ctex-text-muted">
          Success from
          <input
            type="date"
            value={form.dateFrom}
            onChange={(e) =>
              setForm({ ...form, dateFrom: e.target.value })
            }
            className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
          />
        </label>
        <label className="text-xs text-ctex-text-muted">
          Success to
          <input
            type="date"
            value={form.dateTo}
            onChange={(e) =>
              setForm({ ...form, dateTo: e.target.value })
            }
            className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
          />
        </label>
        <label className="text-xs text-ctex-text-muted">
          Provider
          <select
            value={form.provider}
            onChange={(e) =>
              setForm({ ...form, provider: e.target.value })
            }
            className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
          >
            <option value="">All providers</option>
            <option>MONNIFY</option>
            <option>XIXAPAY</option>
          </select>
        </label>
        <label className="text-xs text-ctex-text-muted">
          Settlement status
          <select
            value={form.settlementStatus}
            onChange={(e) =>
              setForm({ ...form, settlementStatus: e.target.value })
            }
            className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
          >
            <option value="">All</option>
            {["PENDING", "REPORTED", "CONFIRMED", "DISCREPANCY", "UNAVAILABLE"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ctex-text-muted">
          Merchant ID
          <input
            value={form.merchantId}
            onChange={(e) =>
              setForm({ ...form, merchantId: e.target.value })
            }
            placeholder="Merchant UUID"
            className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
          />
        </label>
        <button className="self-end rounded-lg bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white">
          Apply filters
        </button>
      </form>

      {/* ---------- Bulk action toolbar (always visible) ---------- */}
      <div
        className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2 text-sm ${
          selectedIds.size > 0
            ? "border-ctex-blue/30 bg-ctex-blue/5"
            : "border-ctex-border bg-ctex-surface"
        }`}
      >
        <span className="text-ctex-text">
          {selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : "Tick rows to reconcile several settlements at once, or use View / Reconcile on a single row."}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedIds.size === 0}
            className="rounded border border-ctex-border px-3 py-1.5 text-xs text-ctex-text disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={openBulkReconcile}
            disabled={selectedIds.size === 0}
            className="rounded bg-ctex-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Reconcile selected{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface">
        <div className="border-b border-ctex-border px-4 py-3">
          <h3 className="font-semibold text-ctex-text">
            Payment financial records
          </h3>
          <p className="text-xs text-ctex-text-muted">
            {pagination.totalItems.toLocaleString()} records · successful
            payments only
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1600px] w-full text-left text-xs">
            <thead className="bg-ctex-elevated text-ctex-text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableRows.length === 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all reconcilable rows"
                  />
                </th>
                {[
                  "Success date",
                  "Merchant",
                  "C-TEX reference",
                  "Provider reference",
                  "Provider",
                  "Gross",
                  "Provider fee (est.)",
                  "C-TEX fee",
                  "Merchant net",
                  "Expected settle",
                  "Reported settle",
                  "Actual settle",
                  "Margin (est.)",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={16}
                    className="p-8 text-center text-ctex-text-muted"
                  >
                    Loading report…
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="p-8 text-center text-ctex-text-muted"
                  >
                    No successful financial records match these filters.
                  </td>
                </tr>
              ) : (
                records.map((row) => {
                  const pay = row.payment || {};
                  const merchantName = getMerchantName(row);

                  const settlement = renderSettlement(
                    row.actualSettlementAmount,
                    row.settlementDisplayKind,
                    row.providerReportedSettlementAmount,
                    row.missingDataReason,
                    row.expectedSettlementAmount
                  );

                  const isSelected = selectedIds.has(row.id);
                  const reconcilable = canReconcile(row);

                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-ctex-border text-ctex-text ${
                        isSelected ? "bg-ctex-blue/5" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!reconcilable}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${pay.paymentReference}`}
                          title={
                            reconcilable
                              ? "Select for bulk reconciliation"
                              : "Already reconciled"
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {row.paymentSuccessAt
                          ? new Date(row.paymentSuccessAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-3">{merchantName || "—"}</td>
                      <td className="px-3 py-3 font-mono">
                        {pay.paymentReference || "—"}
                      </td>
                      <td className="px-3 py-3 font-mono">
                        {pay.providerReference || row.providerReference || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {row.provider || pay.provider || "—"}
                      </td>
                      <td className="px-3 py-3">{money(row.grossAmount)}</td>
                      <td className="px-3 py-3">
                        {row.providerFeeEstimate == null
                          ? "Unknown"
                          : money(row.providerFeeEstimate)}
                      </td>
                      <td className="px-3 py-3">{money(row.serviceFee)}</td>
                      <td className="px-3 py-3">
                        {money(row.merchantNetAmount)}
                      </td>
                      <td className="px-3 py-3">
                        {row.expectedSettlementAmount == null
                          ? "Unknown"
                          : money(row.expectedSettlementAmount)}
                      </td>
                      <td className="px-3 py-3">
                        {row.providerReportedSettlementAmount == null
                          ? "—"
                          : money(row.providerReportedSettlementAmount)}
                      </td>
                      <td
                        className={`px-3 py-3 ${
                          toneClasses[settlement.tone] || ""
                        }`}
                      >
                        {settlement.label}
                      </td>
                      <td className="px-3 py-3">
                        {row.estimatedCtexGrossMargin == null
                          ? "Unknown"
                          : money(row.estimatedCtexGrossMargin)}
                      </td>
                      <td className="px-3 py-3">{row.settlementStatus}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <button
                          type="button"
                          onClick={() => openSingleReconcile(row)}
                          className={`rounded border px-2 py-1 text-[11px] font-medium ${
                            reconcilable
                              ? "border-ctex-blue text-ctex-blue"
                              : "border-ctex-border text-ctex-text-muted"
                          }`}
                          title={
                            reconcilable
                              ? "Record the actual settlement for this payment"
                              : "View reconciled settlement details"
                          }
                        >
                          {reconcilable ? "Reconcile" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-ctex-border p-3 text-xs text-ctex-text-muted">
          <span>
            Page {page} / {Math.max(1, pagination.totalPages)}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Modal ---------- */}
      {modalOpen && (
        <ReconcileModal
          mode={modalMode}
          targets={modalTargets}
          onClose={closeModal}
          onSuccess={onReconcileSuccess}
          onPartial={load}
        />
      )}
    </DashboardLayout>
  );
}

/* ============================================================
 * Reconcile / View Modal
 * ============================================================ */

function DetailCell({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ctex-text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-medium text-ctex-text">{value}</p>
    </div>
  );
}

function ReconcileModal({ mode, targets, onClose, onSuccess, onPartial }) {
  const [rows, setRows] = useState(
    targets.map((t) => ({
      raw: t,
      paymentReference: t.payment?.paymentReference,
      merchantName: getMerchantName(t),
      expected: Number(t.expectedSettlementAmount || 0) / 100,
      reported:
        t.providerReportedSettlementAmount == null
          ? null
          : Number(t.providerReportedSettlementAmount) / 100,
      actual: "", // user input in NGN
      providerFee: "", // optional
    }))
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Read-only when every row is already reconciled
  const viewOnly = rows.every((r) => !canReconcile(r.raw));

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const updateRow = (index, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const buildPayload = (row) => ({
    actualSettlementAmount: Math.round(Number(row.actual) * 100),
    ...(row.providerFee === ""
      ? {}
      : { actualProviderFee: Math.round(Number(row.providerFee) * 100) }),
    reason: reason.trim(),
  });

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (mode === "single") {
        const row = rows[0];
        if (row.actual === "") {
          throw new Error("Actual settlement amount is required");
        }
        await platformAdminService.reconcileFinancialSettlement(
          row.paymentReference,
          buildPayload(row)
        );
      } else {
        // Bulk: backend has no bulk endpoint, so loop with error tolerance.
        const results = [];
        for (const row of rows) {
          if (row.actual === "") {
            results.push({
              paymentReference: row.paymentReference,
              ok: false,
              error: "Missing actual amount",
            });
            continue;
          }
          try {
            await platformAdminService.reconcileFinancialSettlement(
              row.paymentReference,
              buildPayload(row)
            );
            results.push({ paymentReference: row.paymentReference, ok: true });
          } catch (e) {
            results.push({
              paymentReference: row.paymentReference,
              ok: false,
              error:
                e.response?.data?.message ||
                e.message ||
                "Unknown error",
            });
          }
        }

        const failures = results.filter((r) => !r.ok);
        if (failures.length > 0) {
          const failedRefs = new Set(failures.map((f) => f.paymentReference));
          const succeeded = results.length - failures.length;

          // Keep only failed rows in the modal so a retry never resubmits
          // settlements that already succeeded.
          setRows((prev) =>
            prev.filter((r) => failedRefs.has(r.paymentReference))
          );
          if (succeeded > 0 && onPartial) {
            void onPartial();
          }
          throw new Error(
            `${succeeded} succeeded, ${failures.length} failed. First error: ${failures[0].error}`
          );
        }
      }

      await onSuccess();
    } catch (e) {
      setError(
        e.response?.data?.message || e.message || "Reconciliation failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-ctex-border bg-ctex-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ctex-text">
              {viewOnly
                ? "Settlement details"
                : mode === "single"
                ? "Reconcile settlement"
                : `Reconcile ${rows.length} settlements`}
            </h3>
            <p className="mt-1 text-xs text-ctex-text-muted">
              {viewOnly
                ? "This settlement has already been reconciled. Details below are read-only."
                : "Enter the amount confirmed by your bank statement. The reconciliation is recorded as permanent audit evidence."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ctex-text-muted hover:text-ctex-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-3 rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-500"
          >
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-3">
            {rows.map((row, index) => {
              const t = row.raw;
              return (
                <div
                  key={row.paymentReference}
                  className="rounded border border-ctex-border bg-ctex-elevated p-3 text-xs"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-ctex-text">
                        {row.paymentReference}
                      </p>
                      <p className="text-ctex-text-muted">
                        {row.merchantName}
                      </p>
                    </div>
                    <span className="rounded-full border border-ctex-border px-2 py-0.5 text-[10px] font-medium text-ctex-text-muted">
                      {t.settlementStatus}
                    </span>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DetailCell label="Gross" value={money(t.grossAmount)} />
                    <DetailCell
                      label="Provider fee (est.)"
                      value={
                        t.providerFeeEstimate == null
                          ? "Unknown"
                          : money(t.providerFeeEstimate)
                      }
                    />
                    <DetailCell label="C-TEX fee" value={money(t.serviceFee)} />
                    <DetailCell
                      label="Merchant net"
                      value={money(t.merchantNetAmount)}
                    />
                    <DetailCell
                      label="Expected settle"
                      value={
                        t.expectedSettlementAmount == null
                          ? "Unknown"
                          : money(t.expectedSettlementAmount)
                      }
                    />
                    <DetailCell
                      label="Provider reported"
                      value={
                        t.providerReportedSettlementAmount == null
                          ? "—"
                          : money(t.providerReportedSettlementAmount)
                      }
                    />
                    <DetailCell
                      label="Actual settle"
                      value={
                        t.actualSettlementAmount == null
                          ? "Not recorded"
                          : money(t.actualSettlementAmount)
                      }
                    />
                    <DetailCell
                      label="Margin (est.)"
                      value={
                        t.estimatedCtexGrossMargin == null
                          ? "Unknown"
                          : money(t.estimatedCtexGrossMargin)
                      }
                    />
                  </div>

                  {canReconcile(t) && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-[11px] text-ctex-text-muted">
                        Actual settlement received (NGN)
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.actual}
                          onChange={(e) =>
                            updateRow(index, "actual", e.target.value)
                          }
                          placeholder={
                            row.reported != null
                              ? row.reported.toFixed(2)
                              : row.expected.toFixed(2)
                          }
                          className="mt-1 h-9 w-full rounded border border-ctex-border bg-ctex-surface px-2 text-sm text-ctex-text"
                        />
                      </label>
                      <label className="block text-[11px] text-ctex-text-muted">
                        Actual provider fee (optional, NGN)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.providerFee}
                          onChange={(e) =>
                            updateRow(index, "providerFee", e.target.value)
                          }
                          className="mt-1 h-9 w-full rounded border border-ctex-border bg-ctex-surface px-2 text-sm text-ctex-text"
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!viewOnly && (
            <label className="block text-xs text-ctex-text-muted">
              Evidence / reconciliation note (required, min 8 chars)
              <textarea
                required
                minLength={8}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-ctex-border bg-ctex-elevated px-2 py-1.5 text-sm text-ctex-text"
                placeholder="e.g., Bank statement 2026-10-21 line 42 shows NGN 99.00 credit"
              />
            </label>
          )}

          <div className="flex justify-end gap-2 border-t border-ctex-border pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-ctex-border px-4 py-2 text-sm text-ctex-text"
              disabled={saving}
            >
              {viewOnly ? "Close" : "Cancel"}
            </button>
            {!viewOnly && (
              <button
                type="submit"
                disabled={saving || reason.trim().length < 8 || rows.length === 0}
                className="rounded bg-ctex-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Recording…"
                  : mode === "single"
                  ? "Record reconciliation"
                  : `Record ${rows.length} reconciliations`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  // Portal to body so the layout can never clip or hide the modal
  return createPortal(modal, document.body);
}