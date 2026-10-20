import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import walletService from "../../service/wallet.service";
import { buildMerchantNav } from "./merchantNav";

const money = (minor = 0) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", minimumFractionDigits: 2,
}).format(Number(minor || 0) / 100);

export default function WalletPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();
  const navSections = useMemo(() => buildMerchantNav(permissions), [permissions]);
  const [balance, setBalance] = useState(null);
  const [entries, setEntries] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [feeMode, setFeeMode] = useState("FEE_ON_TOP");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [beneficiary, setBeneficiary] = useState(null);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retryKey, setRetryKey] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAuthorization, setPendingAuthorization] = useState(null);
  const [authorizationCode, setAuthorizationCode] = useState("");
  const isWithdraw = location.pathname.endsWith("/withdraw");
  const isTransactions = location.pathname.endsWith("/transactions");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const tasks = [walletService.getBalance()];
      if (isTransactions) tasks.push(walletService.getEntries({ page: 1, limit: 50 }));
      if (isWithdraw && permissions?.includes("payouts.read")) tasks.push(walletService.getPayouts({ page: 1, limit: 20 }));
      const [nextBalance, nextEntries, nextPayouts] = await Promise.all(tasks);
      setBalance(nextBalance);
      if (nextEntries) setEntries(nextEntries.data || []);
      if (nextPayouts) setPayouts(nextPayouts.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load wallet data.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [location.pathname, permissions]);

  useEffect(() => {
    if (!isWithdraw) return;
    let active = true;
    setBanksLoading(true);
    walletService.getPayoutBanks()
      .then((items) => { if (active) setBanks(items || []); })
      .catch((e) => { if (active) setError(e.response?.data?.message || "Could not load supported banks."); })
      .finally(() => { if (active) setBanksLoading(false); });
    return () => { active = false; };
  }, [isWithdraw]);

  useEffect(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) < 10000) {
      setQuote(null); return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const next = await walletService.quotePayout({ amount: Math.round(value * 100), currency: "NGN", feeMode });
        if (active) setQuote(next);
      } catch (e) {
        if (active) { setQuote(null); setError(e.response?.data?.message || "Could not calculate withdrawal fees."); }
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [amount, feeMode]);

  const field = "mt-1 w-full rounded-xl border border-ctex-border bg-ctex-elevated px-3 py-2.5 text-sm text-ctex-text outline-none focus:border-ctex-blue";
  const title = isWithdraw ? "Withdraw" : isTransactions ? "Wallet transactions" : "Wallet balance";

  const validateAccount = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setBeneficiary(null);
    try {
      setBeneficiary(await walletService.validateBankAccount({ bankCode: bankCode.trim(), accountNumber: accountNumber.trim() }));
    } catch (e) { setError(e.response?.data?.message || "Unable to verify this bank account."); }
    finally { setBusy(false); }
  };

  const submitPayout = async () => {
    if (!beneficiary || !quote) return;
    setBusy(true); setError(""); setNotice("");
    const key = retryKey || globalThis.crypto.randomUUID();
    setRetryKey(key);
    try {
      const payout = await walletService.createPayout({
        amount: quote.amount, currency: "NGN", feeMode, bankCode: beneficiary.bankCode,
        accountNumber: beneficiary.accountNumber, accountName: beneficiary.accountName,
      }, key);
      if (payout.authorizationRequired) {
        setPendingAuthorization(payout);
        setNotice("An authorization code was sent to the registered email address for withdrawals. Enter it below to continue.");
        await load();
        return;
      }
      setNotice(`Withdrawal ${payout.status.toLowerCase()}. Reference: ${payout.id}`);
      setRetryKey(""); setAmount(""); setAccountNumber(""); setBeneficiary(null); setQuote(null);
      await load();
    } catch (e) { setError(e.response?.data?.message || "Withdrawal request failed. Retry safely using the same request key."); }
    finally { setBusy(false); }
  };

  const authorizeWithdrawal = async (event) => {
    event.preventDefault();
    if (!pendingAuthorization) return;
    setBusy(true); setError("");
    try {
      const payout = await walletService.authorizePayout(pendingAuthorization.id, authorizationCode.trim());
      setNotice(`Withdrawal ${payout.status.toLowerCase()}. Reference: ${payout.id}`);
      setPendingAuthorization(null); setAuthorizationCode(""); setRetryKey("");
      setAmount(""); setAccountNumber(""); setBeneficiary(null); setQuote(null);
      await load();
    } catch (e) { setError(e.response?.data?.message || "Could not authorize the withdrawal. Check the code and retry."); }
    finally { setBusy(false); }
  };

  return <DashboardLayout title={businessProfile?.businessName || "Merchant workspace"} subtitle={title}
    profileName={user ? `${user.firstName} ${user.lastName}`.trim() : "User"}
    profileRole={roles[0]?.name || "Member"} navSections={navSections}>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{notice}</div>}
    {loading ? <p className="text-sm text-ctex-text-muted">Loading wallet…</p> : <>
      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <BalanceCard label="Available" value={money(balance?.availableBalance)} />
        <BalanceCard label="Reserved" value={money(balance?.pendingBalance)} />
        <BalanceCard label="Total" value={money(balance?.totalBalance)} />
      </section>
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-lg border border-ctex-border px-3 py-2 text-ctex-text" to="/merchant/dashboard/wallet">Balance</Link>
        <Link className="rounded-lg border border-ctex-border px-3 py-2 text-ctex-text" to="/merchant/dashboard/wallet/transactions">Transactions</Link>
        <Link className="rounded-lg border border-ctex-border px-3 py-2 text-ctex-text" to="/merchant/dashboard/wallet/withdraw">Withdraw</Link>
      </div>
      {isWithdraw ? <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-5">
          <h3 className="text-lg font-semibold text-ctex-text">Request a bank withdrawal</h3>
          <label className="mt-4 block text-sm text-ctex-text-muted">Amount (NGN)<input className={field} type="number" min="100" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); setRetryKey(""); }} /></label>
          <label className="mt-4 block text-sm text-ctex-text-muted">Bank
            <select className={field} value={bankCode} disabled={banksLoading} onChange={e => { setBankCode(e.target.value); setBeneficiary(null); }}>
              <option value="">{banksLoading ? "Loading supported banks…" : "Choose a bank"}</option>
              {banks.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm text-ctex-text-muted">Account number<input className={field} inputMode="numeric" maxLength={10} value={accountNumber} onChange={e => { setAccountNumber(e.target.value); setBeneficiary(null); }} /></label>
          <button className="mt-4 rounded-xl border border-ctex-blue px-4 py-2 text-sm text-ctex-blue disabled:opacity-50" disabled={busy || bankCode.length < 3 || accountNumber.length !== 10} onClick={validateAccount}>{busy ? "Please wait…" : "Verify bank account"}</button>
          {beneficiary && <div className="mt-3 rounded-xl bg-ctex-elevated p-3 text-sm text-ctex-text">Verified beneficiary: <strong>{beneficiary.accountName}</strong>{beneficiary.bankName && <span> · {beneficiary.bankName}</span>}</div>}
          <fieldset className="mt-5 space-y-2 text-sm text-ctex-text-muted"><legend className="mb-2 font-medium text-ctex-text">Withdrawal fee option</legend>
            <label className="flex gap-2"><input type="radio" checked={feeMode === "FEE_ON_TOP"} onChange={() => setFeeMode("FEE_ON_TOP")} /> Fee on top: beneficiary receives requested amount; fee is added to wallet debit.</label>
            <label className="flex gap-2"><input type="radio" checked={feeMode === "DEDUCT_FROM_AMOUNT"} onChange={() => setFeeMode("DEDUCT_FROM_AMOUNT")} /> Deduct fee: wallet debit is requested amount; beneficiary receives the remainder.</label>
          </fieldset>
          {pendingAuthorization && <form onSubmit={authorizeWithdrawal} className="mt-5 border-t border-ctex-border pt-4">
            <label className="block text-sm text-ctex-text-muted">Withdrawal authorization code<input className={field} inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={authorizationCode} onChange={e => setAuthorizationCode(e.target.value.replace(/\D/g, ""))} /></label>
            <button className="mt-3 w-full rounded-xl bg-ctex-blue px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={busy || authorizationCode.length < 4}>{busy ? "Authorizing…" : "Authorize withdrawal"}</button>
          </form>}
        </section>
        <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-5">
          <h3 className="text-lg font-semibold text-ctex-text">Review withdrawal</h3>
          {quote ? <dl className="mt-4 space-y-3 text-sm text-ctex-text-muted">
            <SummaryRow label="Requested" value={money(quote.amount)} /><SummaryRow label="Fee" value={money(quote.feeAmount)} />
            <SummaryRow label="Wallet debit" value={money(quote.walletDebitAmount)} strong /><SummaryRow label="Beneficiary receives" value={money(quote.beneficiaryAmount)} strong />
            {beneficiary && <p>To {beneficiary.accountName} ••••{beneficiary.accountNumber.slice(-4)}</p>}
            <button disabled={busy || !beneficiary} onClick={submitPayout} className="mt-3 w-full rounded-xl bg-ctex-blue px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Submitting…" : "Confirm withdrawal"}</button>
          </dl> : <p className="mt-3 text-sm text-ctex-text-muted">Enter a valid amount to see its fee and wallet debit.</p>}
        </section>
        {payouts.length > 0 && <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 xl:col-span-2"><h3 className="mb-3 font-semibold text-ctex-text">Recent withdrawals</h3><Rows items={payouts} payout /></section>}
      </div> : <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-5">
        <h3 className="mb-3 text-lg font-semibold text-ctex-text">{isTransactions ? "Ledger activity" : "Recent ledger activity"}</h3>
        <Rows items={entries} />
      </section>}
    </>}
  </DashboardLayout>;
}

function BalanceCard({ label, value }) { return <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5"><p className="text-sm text-ctex-text-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-ctex-text">{value}</p></div>; }
function SummaryRow({ label, value, strong }) { return <div className={`flex justify-between ${strong ? "font-semibold text-ctex-text" : ""}`}><dt>{label}</dt><dd>{value}</dd></div>; }
function Rows({ items, payout = false }) { return !items?.length ? <p className="py-5 text-sm text-ctex-text-muted">No activity yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-ctex-text-muted"><th className="py-2">Reference</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{items.map(row => <tr key={row.id} className="border-t border-ctex-border text-ctex-text"><td className="py-3">{row.transaction?.reference || row.id}</td><td>{payout ? "Withdrawal" : row.transaction?.type || "Ledger entry"}</td><td>{money(row.walletDebitAmount ?? row.amount)}</td><td>{row.status || row.direction}</td><td>{new Date(row.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>; }
