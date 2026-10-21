import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const labels = {
  UNDER_10000: "Below ₦10,000",
  FROM_10000_TO_50000: "₦10,000 to below ₦50,000",
  FROM_50000: "₦50,000 and above",
};
const money = (minor) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(Number(minor || 0) / 100);

export default function WithdrawalFeeSettingsPage() {
  const { user } = useAuthStore();
  const [tiers, setTiers] = useState([]);
  const [charges, setCharges] = useState({});
  const [reason, setReason] = useState("");
  const [previewAmount, setPreviewAmount] = useState("10000");
  const [feeMode, setFeeMode] = useState("FEE_ON_TOP");
  const [preview, setPreview] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navSections = useMemo(() => [{ title: "Platform", items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/super-admin/dashboard" },
    { key: "merchants", label: "Merchants", icon: "business", path: "/super-admin/merchants" },
    { key: "transactions", label: "Transactions", icon: "transactions", path: "/super-admin/transactions" },
    { key: "financials", label: "Financial breakdown", icon: "fees", path: "/super-admin/financials" },
    { key: "withdrawal-fees", label: "Withdrawal charges", icon: "fees", path: "/super-admin/withdrawal-fees" },
    { key: "fees", label: "Payment fee configuration", icon: "fees", path: "/super-admin/fees" },
    { key: "audit-logs", label: "Audit logs", icon: "security", path: "/super-admin/audit-logs" },
  ] }], []);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await platformAdminService.getWithdrawalFeeTiers();
      setTiers(data || []);
      setCharges(Object.fromEntries((data || []).map(tier => [tier.tierKey, (Number(tier.feeAmount) / 100).toFixed(2)])));
    } catch (e) { setError(e.response?.data?.message || "Could not load withdrawal fee settings."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const majorAmount = Number(previewAmount);
    if (!Number.isFinite(majorAmount) || majorAmount <= 0) return;
    let active = true;
    const timer = setTimeout(() => platformAdminService.previewWithdrawalFee({ amount: Math.round(majorAmount * 100), feeMode })
      .then(value => { if (active) setPreview(value); })
      .catch(() => { if (active) setPreview(null); }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [previewAmount, feeMode, tiers]);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const fees = tiers.map(tier => ({ tierKey: tier.tierKey, feeAmount: Math.round(Number(charges[tier.tierKey]) * 100) }));
      const updated = await platformAdminService.updateWithdrawalFeeTiers({ fees, reason: reason.trim() });
      setTiers(updated); setCharges(Object.fromEntries(updated.map(tier => [tier.tierKey, (Number(tier.feeAmount) / 100).toFixed(2)])));
      setReason(""); setNotice("Withdrawal charges saved. New withdrawals will use this schedule; existing withdrawals keep their fee snapshots.");
    } catch (e) { setError(e.response?.data?.message || "Unable to save the withdrawal charges."); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const updated = await platformAdminService.resetWithdrawalFeeTiers({ reason: reason.trim() });
      setTiers(updated); setCharges(Object.fromEntries(updated.map(tier => [tier.tierKey, (Number(tier.feeAmount) / 100).toFixed(2)])));
      setReason(""); setConfirmReset(false); setNotice("Default withdrawal charges restored.");
    } catch (e) { setError(e.response?.data?.message || "Unable to restore default charges."); }
    finally { setSaving(false); }
  };

  return <DashboardLayout title="Super Admin" subtitle="Merchant withdrawal charges" navSections={navSections} profileName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Super Admin"} profileRole={user?.role}>
    <div className="mb-5"><h2 className="text-xl font-semibold text-ctex-text">Merchant withdrawal charges</h2><p className="mt-1 text-sm text-ctex-text-muted">Fixed amount ranges are preserved; administrators can change the C-TEX PAY charge for each range. All amounts are stored in kobo.</p></div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">{notice}</p>}
    <form onSubmit={submit} className="rounded-xl border border-ctex-border bg-ctex-surface p-5">
      {loading ? <p className="py-8 text-center text-sm text-ctex-text-muted">Loading fee tiers…</p> : <>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-ctex-border text-xs text-ctex-text-muted"><th className="py-3">Withdrawal amount</th><th>Charge (NGN)</th><th>Last updated</th><th>Updated by</th></tr></thead><tbody>
          {tiers.map(tier => <tr key={tier.id} className="border-b border-ctex-border"><td className="py-4 text-ctex-text">{labels[tier.tierKey]}</td><td><label className="sr-only" htmlFor={`fee-${tier.tierKey}`}>{labels[tier.tierKey]} charge</label><input id={`fee-${tier.tierKey}`} required type="number" min="0" max="1000000" step="0.01" value={charges[tier.tierKey] ?? ""} onChange={e => setCharges({ ...charges, [tier.tierKey]: e.target.value })} className="h-10 w-40 rounded-lg border border-ctex-border bg-ctex-elevated px-3 text-ctex-text" /></td><td className="text-xs text-ctex-text-muted">{tier.updatedAt ? new Date(tier.updatedAt).toLocaleString() : "—"}</td><td className="font-mono text-xs text-ctex-text-muted">{tier.updatedBy || "System default"}</td></tr>)}
        </tbody></table></div>
        <label className="mt-5 block text-xs text-ctex-text-muted">Reason for change (required for audit)<input required minLength={8} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-3 text-sm text-ctex-text" placeholder="Explain why these charges are changing" /></label>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setConfirmReset(true)} disabled={saving || loading} className="rounded-lg border border-ctex-border px-4 py-2 text-sm text-ctex-text">Restore default tiers</button><button disabled={saving || loading || tiers.length !== 3} className="rounded-lg bg-ctex-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save charges"}</button></div>
      </>}
    </form>
    <section className="mt-5 rounded-xl border border-ctex-border bg-ctex-surface p-5"><h3 className="font-semibold text-ctex-text">Fee preview</h3><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs text-ctex-text-muted">Requested payout (NGN)<input type="number" min="0.01" step="0.01" value={previewAmount} onChange={e => setPreviewAmount(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-3 text-sm text-ctex-text" /></label><label className="text-xs text-ctex-text-muted">Fee option<select value={feeMode} onChange={e => setFeeMode(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-3 text-sm text-ctex-text"><option value="FEE_ON_TOP">Fee added to wallet debit</option><option value="DEDUCT_FROM_AMOUNT">Fee deducted from payout</option></select></label></div>
      {preview && preview.amount === Math.round(Number(previewAmount) * 100) && preview.feeMode === feeMode && <div className="mt-4 grid gap-2 text-sm text-ctex-text-muted sm:grid-cols-2"><p>Tier: <strong className="text-ctex-text">{labels[preview.feeSnapshot.tierKey]}</strong></p><p>C-TEX withdrawal charge: <strong className="text-ctex-text">{money(preview.feeAmount)}</strong></p><p>Wallet debit: <strong className="text-ctex-text">{money(preview.walletDebitAmount)}</strong></p><p>Beneficiary receives: <strong className="text-ctex-text">{money(preview.beneficiaryAmount)}</strong></p><p>Provider payout charge: <strong className="text-ctex-text">Unknown; no provider fee is assumed or included.</strong></p></div>}
    </section>
    {confirmReset && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-xl border border-ctex-border bg-ctex-surface p-5"><h3 className="text-lg font-semibold text-ctex-text">Restore default withdrawal charges?</h3><p className="mt-2 text-sm text-ctex-text-muted">This updates charges for future withdrawals only. Existing fee snapshots remain unchanged. Enter a reason above before confirming.</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirmReset(false)} className="rounded-lg border border-ctex-border px-3 py-2 text-sm text-ctex-text">Cancel</button><button disabled={saving || reason.trim().length < 8} onClick={reset} className="rounded-lg bg-ctex-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Restoring…" : "Confirm restore"}</button></div></div></div>}
  </DashboardLayout>;
}
