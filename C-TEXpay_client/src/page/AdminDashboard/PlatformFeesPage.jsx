import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const LIMIT = 20;
const INITIAL_FORM = {
  name: "",
  description: "",
  merchantId: "",
  currency: "NGN",
  paymentMethod: "ACCOUNT_TRANSFER",
  feeType: "PERCENTAGE",
  percentageRateBps: "50",
  fixedAmount: "0",
  minimumFee: "0",
  maximumFee: "",
  providerFeeTreatment: "UNKNOWN",
  effectiveFrom: "",
  effectiveUntil: "",
};

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatMinor(value, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0) / 100);
}

function formatRate(config) {
  const percentage = Number(config.percentageRateBps || 0) / 100;
  const fixed = Number(config.fixedAmount || 0);
  if (config.feeType === "FIXED") return formatMinor(fixed, config.currency);
  if (config.feeType === "PERCENTAGE_PLUS_FIXED") return `${percentage.toFixed(2)}% + ${formatMinor(fixed, config.currency)}`;
  return `${percentage.toFixed(2)}%`;
}

export default function PlatformFeesPage({ basePath = "/admin" }) {
  const { user } = useAuthStore();
  const [configs, setConfigs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    let active = true;
    platformAdminService.getFeeConfigurations({
      page,
      limit: LIMIT,
      ...(statusFilter ? { status: statusFilter } : {}),
    })
      .then((response) => {
        if (!active) return;
        setConfigs(response.data || []);
        setMeta(response.meta || { page, limit: LIMIT, total: 0, totalPages: 0 });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load platform fee rules.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, statusFilter]);

  const navSections = useMemo(() => [{
    title: "Platform",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard", path: `${basePath}/dashboard` },
      { key: "payments", label: "Transactions", icon: "transactions", path: `${basePath}/transactions` },
      { key: "fees", label: "Fee configuration", icon: "fees", path: `${basePath}/fees` },
    ],
  }], [basePath]);

  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Platform admin";

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleEdit = (config) => {
    setEditingId(config.id);
    setForm({
      name: config.name || "",
      description: config.description || "",
      merchantId: config.merchantId || "",
      currency: config.currency || "NGN",
      paymentMethod: config.paymentMethod || "",
      feeType: config.feeType || "PERCENTAGE",
      percentageRateBps: String(config.percentageRateBps || 0),
      fixedAmount: String(config.fixedAmount || 0),
      minimumFee: String(config.minimumFee || 0),
      maximumFee: config.maximumFee === null ? "" : String(config.maximumFee),
      providerFeeTreatment: config.providerFeeTreatment || "UNKNOWN",
      effectiveFrom: toDatetimeLocal(config.effectiveFrom),
      effectiveUntil: toDatetimeLocal(config.effectiveUntil),
    });
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      percentageRateBps: Number(form.percentageRateBps || 0),
      fixedAmount: Number(form.fixedAmount || 0),
      minimumFee: Number(form.minimumFee || 0),
      maximumFee: form.maximumFee === "" ? null : Number(form.maximumFee),
      providerFeeTreatment: form.providerFeeTreatment,
    };

    if (form.effectiveFrom) payload.effectiveFrom = new Date(form.effectiveFrom).toISOString();
    if (form.effectiveUntil) payload.effectiveUntil = new Date(form.effectiveUntil).toISOString();

    if (!editingId) {
      payload.merchantId = form.merchantId.trim() || null;
      payload.currency = form.currency;
      payload.paymentMethod = form.paymentMethod || null;
      payload.feeType = form.feeType;
    }

    return payload;
  };

  const reloadConfigs = async () => {
    setLoading(true);
    try {
      const response = await platformAdminService.getFeeConfigurations({
        page,
        limit: LIMIT,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setConfigs(response.data || []);
      setMeta(response.meta || { page, limit: LIMIT, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (editingId) {
        await platformAdminService.updateFeeConfiguration(editingId, payload);
        toast.success("Fee configuration updated.");
      } else {
        await platformAdminService.createFeeConfiguration(payload);
        toast.success("Fee configuration created.");
      }
      resetForm();
      await reloadConfigs();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to save fee configuration.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (config) => {
    if (actionId) return;
    const nextStatus = config.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setActionId(config.id);
    try {
      await platformAdminService.setFeeConfigurationStatus(config.id, nextStatus);
      await reloadConfigs();
      toast.success(`Fee rule ${nextStatus.toLowerCase()}.`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to change fee rule status.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <DashboardLayout
      title="Platform administration"
      subtitle="Fee configuration"
      navSections={navSections}
      profileName={displayName}
      profileRole={user?.role}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold text-ctex-text">Platform fee rules</h2><p className="mt-1 text-sm text-ctex-text-muted">Manage platform defaults and merchant-specific overrides. Amount fields are minor currency units.</p></div>
        <label className="text-xs text-ctex-text-muted">Status
          <select value={statusFilter} onChange={(event) => { setLoading(true); setError(""); setStatusFilter(event.target.value); setPage(1); }} className="ml-2 h-9 rounded-lg border border-ctex-border bg-ctex-surface px-2 text-sm text-ctex-text">
            <option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.5fr)]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-ctex-border bg-ctex-surface p-5">
          <h3 className="text-base font-semibold text-ctex-text">{editingId ? "Edit fee rule" : "Create fee rule"}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Rule name" name="name" value={form.name} onChange={handleChange} required maxLength={100} className="sm:col-span-2" />
            <Field label="Description" name="description" value={form.description} onChange={handleChange} maxLength={500} className="sm:col-span-2" />
            {!editingId && <Field label="Merchant ID (blank = platform default)" name="merchantId" value={form.merchantId} onChange={handleChange} placeholder="Optional UUID" className="sm:col-span-2" />}
            {!editingId && <SelectField label="Currency" name="currency" value={form.currency} onChange={handleChange} options={[["NGN", "NGN"]]} />}
            {!editingId && <SelectField label="Payment method" name="paymentMethod" value={form.paymentMethod} onChange={handleChange} options={[["", "All methods"], ["ACCOUNT_TRANSFER", "Account transfer"]]} />}
            {!editingId && <SelectField label="Fee type" name="feeType" value={form.feeType} onChange={handleChange} options={[["PERCENTAGE", "Percentage"], ["FIXED", "Fixed"], ["PERCENTAGE_PLUS_FIXED", "Percentage + fixed"]]} />}
            <Field label="Percentage (basis points)" name="percentageRateBps" type="number" min="0" max="10000" value={form.percentageRateBps} onChange={handleChange} />
            <Field label="Fixed amount (minor units)" name="fixedAmount" type="number" min="0" value={form.fixedAmount} onChange={handleChange} />
            <Field label="Minimum fee (minor units)" name="minimumFee" type="number" min="0" value={form.minimumFee} onChange={handleChange} />
            <Field label="Maximum fee (blank = uncapped)" name="maximumFee" type="number" min="0" value={form.maximumFee} onChange={handleChange} />
            <SelectField label="Provider fee treatment" name="providerFeeTreatment" value={form.providerFeeTreatment} onChange={handleChange} options={[["UNKNOWN", "Unknown"], ["ABSORBED", "Absorbed"], ["PASSED_TO_MERCHANT", "Passed to merchant"]]} />
            <Field label="Effective from" name="effectiveFrom" type="datetime-local" value={form.effectiveFrom} onChange={handleChange} />
            <Field label="Effective until" name="effectiveUntil" type="datetime-local" value={form.effectiveUntil} onChange={handleChange} />
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-ctex-border pt-4">
            {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-ctex-border px-3 py-2 text-xs text-ctex-text-muted">Cancel</button>}
            <button type="submit" disabled={saving} className="rounded-lg bg-ctex-blue px-4 py-2 text-xs font-semibold text-white hover:bg-ctex-blue-light disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save changes" : "Create rule"}</button>
          </div>
        </form>

        <section className="overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface">
          <div className="flex items-center justify-between border-b border-ctex-border px-4 py-3"><div><h3 className="text-sm font-semibold text-ctex-text">Configured rules</h3><p className="mt-0.5 text-xs text-ctex-text-muted">{meta.total.toLocaleString()} total</p></div><span className="text-xs text-ctex-text-muted">Page {page} / {Math.max(meta.totalPages, 1)}</span></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ctex-border">
              <thead className="bg-ctex-elevated/50 text-left text-xs text-ctex-text-muted"><tr><th className="px-3 py-2.5 font-medium">Rule</th><th className="px-3 py-2.5 font-medium">Scope</th><th className="px-3 py-2.5 font-medium">Rate</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5" /></tr></thead>
              <tbody className="divide-y divide-ctex-border">
                {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-ctex-text-muted">Loading fee rules…</td></tr> : configs.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-ctex-text-muted">No fee rules match this filter.</td></tr> : configs.map((config) => (
                  <tr key={config.id} className="hover:bg-ctex-elevated/30">
                    <td className="min-w-48 px-3 py-3"><span className="block text-sm font-medium text-ctex-text">{config.name}</span><span className="mt-1 block text-xs text-ctex-text-muted">{config.currency} · {config.paymentMethod || "All methods"}</span><span className="mt-1 block font-mono text-[10px] text-ctex-text-muted">{config.id}</span></td>
                    <td className="px-3 py-3 text-xs text-ctex-text-muted">{config.merchantId ? `Merchant ${config.merchantId.slice(0, 8)}…` : "Platform default"}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-ctex-text">{formatRate(config)}<span className="mt-1 block text-[10px] text-ctex-text-muted">min {formatMinor(config.minimumFee)} · max {config.maximumFee === null ? "none" : formatMinor(config.maximumFee)}</span></td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${config.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500" : "bg-ctex-elevated text-ctex-text-muted"}`}>{config.status}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => handleEdit(config)} className="rounded-lg border border-ctex-border px-2.5 py-1.5 text-xs text-ctex-text hover:bg-ctex-elevated">Edit</button><button type="button" disabled={actionId === config.id} onClick={() => handleStatusChange(config)} className="rounded-lg border border-ctex-border px-2.5 py-1.5 text-xs text-ctex-text hover:bg-ctex-elevated disabled:opacity-50">{actionId === config.id ? "…" : config.status === "ACTIVE" ? "Deactivate" : "Activate"}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 border-t border-ctex-border px-3 py-3"><button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1); }} className="rounded-lg border border-ctex-border px-3 py-1.5 text-xs text-ctex-text disabled:opacity-40">Previous</button><button type="button" disabled={page >= meta.totalPages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }} className="rounded-lg border border-ctex-border px-3 py-1.5 text-xs text-ctex-text disabled:opacity-40">Next</button></div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, name, value, onChange, type = "text", min, max, maxLength, required, placeholder, className = "" }) {
  return <label className={`block text-xs text-ctex-text-muted ${className}`}>{label}<input name={name} type={type} min={min} max={max} maxLength={maxLength} required={required} value={value} onChange={onChange} placeholder={placeholder} step={type === "number" ? "1" : undefined} className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue" /></label>;
}

function SelectField({ label, name, value, onChange, options }) {
  return <label className="block text-xs text-ctex-text-muted">{label}<select name={name} value={value} onChange={onChange} className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
