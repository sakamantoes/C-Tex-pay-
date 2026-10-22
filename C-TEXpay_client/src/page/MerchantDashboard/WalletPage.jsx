import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Landmark,
  Loader2,
  Receipt,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import walletService from "../../service/wallet.service";
import { buildMerchantNav } from "./merchantNav";
import InsufficientBalanceModal from "../../components/wallet/InsufficientBalanceModal";
import PayoutPendingModal from "../../components/wallet/PayoutPendingModal";
import PayoutSuccessModal from "../../components/wallet/PayoutSuccessModal";

/* =========================================================
 * HELPERS
 * ======================================================= */

const money = (minor = 0) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", minimumFractionDigits: 2,
}).format(Number(minor || 0) / 100);

const AMOUNT_PRESETS = [5000, 10000, 50000, 100000];

// [label shown on chip, lowercase bank name as returned by the provider]
const POPULAR_BANKS = [
  ["Access", "access bank"],
  ["GTBank", "gtbank"],
  ["Zenith", "zenith bank"],
  ["First Bank", "first bank of nigeria"],
  ["UBA", "united bank for africa"],
  ["OPay", "opay"],
  ["Moniepoint", "moniepoint"],
  ["PalmPay", "palmpay"],
  ["Kuda", "kuda mfb"],
  ["Wema", "wema bank"],
  ["Fidelity", "fidelity bank"],
  ["Stanbic", "stanbic ibtc bank"],
];

const TONES = {
  green: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/25",
  red: "bg-red-500/10 text-red-400 ring-red-500/25",
  neutral: "bg-ctex-elevated text-ctex-text-muted ring-ctex-border",
};

function statusTone(value) {
  const s = String(value || "").toUpperCase();
  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "POSTED", "CREDIT"].includes(s)) return "green";
  if (["PENDING", "PROCESSING", "IN_PROGRESS"].includes(s)) return "amber";
  if (["FAILED", "REJECTED", "ERROR"].includes(s)) return "red";
  return "neutral";
}

function sentenceCase(value) {
  const s = String(value || "").replace(/_/g, " ").toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "B";
}

const inputBase =
  "w-full rounded-xl border border-ctex-border bg-ctex-elevated px-3 py-3 text-sm text-ctex-text outline-none transition placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus-visible:ring-2 focus-visible:ring-ctex-blue/30";

/* =========================================================
 * PAGE
 * ======================================================= */

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
  const [banksError, setBanksError] = useState(false);
  const [banksNonce, setBanksNonce] = useState(0);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [beneficiary, setBeneficiary] = useState(null);
  const [verifyKey, setVerifyKey] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyNonce, setVerifyNonce] = useState(0);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retryKey, setRetryKey] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAuthorization, setPendingAuthorization] = useState(null);
  const [authorizationCode, setAuthorizationCode] = useState("");

  /* Modals */
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [pendingModal, setPendingModal] = useState({
    open: false,
    variant: "PROCESSING",
    payout: null,
  });
  const [successModal, setSuccessModal] = useState({
    open: false,
    payout: null,
  });

  /*
   * Snapshot of the recipient captured at submission time. `beneficiary`
   * and `quote` are cleared after a successful request, so we retain
   * this snapshot for the modal to display even after the form resets.
   */
  const [lastPayout, setLastPayout] = useState(null);

  const isWithdraw = location.pathname.endsWith("/withdraw");
  const isTransactions = location.pathname.endsWith("/transactions");

  const load = useCallback(async () => {
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
  }, [isTransactions, isWithdraw, permissions]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!isWithdraw) return;
    let active = true;
    const timer = setTimeout(() => {
      setBanksLoading(true); setBanksError(false);
      walletService.getPayoutBanks()
        .then((items) => { if (active) setBanks(items || []); })
        .catch(() => { if (active) setBanksError(true); })
        .finally(() => { if (active) setBanksLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [isWithdraw, banksNonce]);

  useEffect(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) < 10000) {
      return;
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

  /* Auto-verify as soon as a bank and a 10-digit account number are present. */
  const currentVerifyKey = `${bankCode.trim()}:${accountNumber.trim()}:${verifyNonce}`;
  const verifying = verifyKey === currentVerifyKey;

  useEffect(() => {
    if (!isWithdraw) return;
    const code = bankCode.trim();
    const number = accountNumber.trim();
    if (!code || number.length !== 10) return;
    const key = `${code}:${number}:${verifyNonce}`;
    let active = true;
    const timer = setTimeout(async () => {
      setVerifyKey(key); setVerifyError("");
      try {
        const result = await walletService.validateBankAccount({ bankCode: code, accountNumber: number });
        if (active) setBeneficiary(result);
      } catch (e) {
        if (active) setVerifyError(e.response?.data?.message || "Unable to verify this bank account.");
      } finally { if (active) setVerifyKey(""); }
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [isWithdraw, bankCode, accountNumber, verifyNonce]);

  const sortedBanks = useMemo(() => {
    const seen = new Set();
    return [...banks]
      .filter((b) => b?.code && b?.name && !seen.has(b.code) && seen.add(b.code))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [banks]);

  const title = isWithdraw ? "Withdraw" : isTransactions ? "Wallet transactions" : "Wallet balance";
  const amountNumber = Number(amount);
  const amountMinor = Math.round(amountNumber * 100);
  const amountValid = Number.isFinite(amountNumber) && amountMinor >= 10000;
  const quoteReady = Boolean(quote) && quote.amount === amountMinor && quote.feeMode === feeMode;
  const exceedsBalance = quoteReady && balance && Number(quote.walletDebitAmount) > Number(balance.availableBalance || 0);

  const resetRequestKey = () => setRetryKey("");

  /* Clears the form after the user has been told the outcome. */
  const resetAfterSuccess = () => {
    setRetryKey("");
    setAmount("");
    setAccountNumber("");
    setBeneficiary(null);
    setQuote(null);
  };

  const submitPayout = async () => {
    if (!beneficiary || !quote) return;

    if (exceedsBalance) {
      setShowInsufficientModal(true);
      return;
    }

    setBusy(true); setError(""); setNotice("");
    const key = retryKey || globalThis.crypto.randomUUID();
    setRetryKey(key);

    // Snapshot recipient before form is cleared after a successful submit.
    const snapshot = {
      accountName: beneficiary.accountName,
      accountNumber: beneficiary.accountNumber,
      bankName: beneficiary.bankName || null,
    };

    try {
      const payout = await walletService.createPayout({
        amount: quote.amount, currency: "NGN", feeMode, bankCode: beneficiary.bankCode,
        accountNumber: beneficiary.accountNumber, accountName: beneficiary.accountName,
      }, key);

      const merged = { ...payout, ...snapshot };
      setLastPayout(merged);

      const status = String(payout.status || "").toUpperCase();

      // PENDING_AUTHORIZATION — merchant must enter an OTP.
      if (payout.authorizationRequired) {
        setPendingAuthorization(payout);
        setPendingModal({
          open: true,
          variant: "AUTHORIZATION",
          payout: merged,
        });
        await load();
        // Do not clear the form — merchant may need to retry if the code fails.
        return;
      }

      // PROCESSING — awaiting provider settlement.
      if (status === "PROCESSING") {
        setPendingModal({
          open: true,
          variant: "PROCESSING",
          payout: merged,
        });
        resetAfterSuccess();
        await load();
        return;
      }

      // SUCCESS — confirmed settled.
      if (status === "SUCCESS") {
        setSuccessModal({ open: true, payout: merged });
        resetAfterSuccess();
        await load();
        return;
      }

      // Fallback: unknown status — keep the banner approach.
      setNotice(`Withdrawal ${String(payout.status || "submitted").toLowerCase()}. Reference: ${payout.id}`);
      resetAfterSuccess();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Withdrawal request failed. Retry safely using the same request key.");
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawAvailable = () => {
    const available = Number(balance?.availableBalance || 0);
    const fee = Number(quote?.feeAmount || 0);
    const maxMinor = feeMode === "FEE_ON_TOP" ? available - fee : available;
    if (maxMinor >= 10000) {
      setAmount(String(Math.floor(maxMinor / 100)));
      resetRequestKey();
    }
    setShowInsufficientModal(false);
  };

  const authorizeWithdrawal = async (event) => {
    event.preventDefault();
    if (!pendingAuthorization) return;
    setBusy(true); setError("");
    try {
      const payout = await walletService.authorizePayout(pendingAuthorization.id, authorizationCode.trim());
      const snapshot = lastPayout || {};
      const merged = { ...snapshot, ...payout };
      const status = String(payout.status || "").toUpperCase();

      if (status === "SUCCESS") {
        setSuccessModal({ open: true, payout: merged });
        setPendingModal({ open: false, variant: "PROCESSING", payout: null });
        setPendingAuthorization(null);
        setAuthorizationCode("");
        resetAfterSuccess();
      } else if (status === "PROCESSING") {
        setPendingModal({
          open: true,
          variant: "PROCESSING",
          payout: merged,
        });
        setPendingAuthorization(null);
        setAuthorizationCode("");
        resetAfterSuccess();
      } else {
        setNotice(`Withdrawal ${status.toLowerCase()}. Reference: ${payout.id}`);
        setPendingAuthorization(null);
        setAuthorizationCode("");
        resetAfterSuccess();
      }
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not authorize the withdrawal. Check the code and retry.");
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { to: "/merchant/dashboard/wallet", label: "Balance", icon: Wallet, current: !isWithdraw && !isTransactions },
    { to: "/merchant/dashboard/wallet/transactions", label: "Transactions", icon: Receipt, current: isTransactions },
    { to: "/merchant/dashboard/wallet/withdraw", label: "Withdraw", icon: ArrowUpRight, current: isWithdraw },
  ];

  return <DashboardLayout title={businessProfile?.businessName || "Merchant workspace"} subtitle={title}
    profileName={user ? `${user.firstName} ${user.lastName}`.trim() : "User"}
    profileRole={roles[0]?.name || "Member"} navSections={navSections}>
    <div className="mx-auto w-full max-w-6xl">
      {error && <Banner tone="error" onClose={() => setError("")}>{error}</Banner>}
      {notice && <Banner tone="success" onClose={() => setNotice("")}>{notice}</Banner>}

      {loading ? <WalletSkeleton /> : <>
        <BalanceHero balance={balance} showWithdraw={!isWithdraw} />

        <nav aria-label="Wallet sections" className="mb-6 inline-flex w-full gap-1 rounded-2xl border border-ctex-border bg-ctex-surface p-1 sm:w-auto">
          {tabs.map(({ to, label, icon: Icon, current }) => (
            <Link key={to} to={to} aria-current={current ? "page" : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 sm:flex-none ${current ? "bg-ctex-blue text-white shadow-sm" : "text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>

        {isWithdraw ? <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
          {/* ---------- LEFT: request form ---------- */}
          <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ctex-text">Withdraw to a bank account</h2>
            <p className="mt-1 text-sm text-ctex-text-muted">Funds leave your available balance as soon as you confirm.</p>

            <div className="mt-6 divide-y divide-ctex-border">
              {/* Step 1 — amount */}
              <Step n={1} title="How much do you want to withdraw?" done={amountValid}>
                <label htmlFor="wd-amount" className="sr-only">Amount in naira</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-ctex-text-muted">₦</span>
                  <input id="wd-amount" className={`${inputBase} py-4 pl-10 text-2xl font-semibold tabular-nums tracking-tight`}
                    type="number" min="100" step="0.01" inputMode="decimal" placeholder="0.00" value={amount}
                    onChange={e => { setAmount(e.target.value); resetRequestKey(); }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {AMOUNT_PRESETS.map(v => (
                    <button key={v} type="button" onClick={() => { setAmount(String(v)); resetRequestKey(); }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/40 ${amountNumber === v ? "border-ctex-blue bg-ctex-blue/10 text-ctex-blue" : "border-ctex-border text-ctex-text-muted hover:border-ctex-blue/50 hover:text-ctex-text"}`}>
                      ₦{v.toLocaleString("en-NG")}
                    </button>
                  ))}
                </div>
                <p className={`mt-2 text-xs ${amount && !amountValid ? "text-amber-400" : "text-ctex-text-muted"}`}>
                  {amount && !amountValid ? "The minimum withdrawal is ₦100.00." : `Available: ${money(balance?.availableBalance)}`}
                </p>
              </Step>

              {/* Step 2 — recipient */}
              <Step n={2} title="Where should it go?" done={Boolean(beneficiary)}>
                <label className="mb-1.5 block text-sm font-medium text-ctex-text">Bank</label>
                <BankPicker banks={sortedBanks} loading={banksLoading} failed={banksError} value={bankCode}
                  onRetry={() => setBanksNonce(n => n + 1)}
                  onSelect={(code) => { setBankCode(code); setBeneficiary(null); setVerifyError(""); resetRequestKey(); }} />

                <div className="mt-4 flex items-baseline justify-between">
                  <label htmlFor="wd-account" className="text-sm font-medium text-ctex-text">Account number</label>
                  <span className="text-xs tabular-nums text-ctex-text-muted">{accountNumber.length}/10</span>
                </div>
                <input id="wd-account" className={`${inputBase} mt-1.5 text-base tabular-nums tracking-widest`}
                  inputMode="numeric" autoComplete="off" maxLength={10} placeholder="0123456789" value={accountNumber}
                  onChange={e => { setAccountNumber(e.target.value.replace(/\D/g, "")); setBeneficiary(null); setVerifyError(""); resetRequestKey(); }} />

                <div aria-live="polite" className="mt-3 min-h-[3rem]">
                  {verifying && <p className="flex items-center gap-2 text-sm text-ctex-text-muted"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Verifying account…</p>}
                  {!verifying && beneficiary && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ctex-text">{beneficiary.accountName}</p>
                        <p className="truncate text-xs text-ctex-text-muted">{beneficiary.bankName || "Verified account"} · ••••{beneficiary.accountNumber.slice(-4)}</p>
                      </div>
                    </div>
                  )}
                  {!verifying && !beneficiary && verifyError && (
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400">
                      <span className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{verifyError}</span>
                      <button type="button" className="shrink-0 font-medium underline underline-offset-2" onClick={() => setVerifyNonce(n => n + 1)}>Try again</button>
                    </div>
                  )}
                  {!verifying && !beneficiary && !verifyError && (
                    <p className="text-xs text-ctex-text-muted">
                      {accountNumber.length === 10 && !bankCode ? "Choose a bank and we’ll verify this account." : "We verify the account name automatically once you enter all 10 digits."}
                    </p>
                  )}
                </div>
              </Step>

              {/* Step 3 — fee option */}
              <Step n={3} title="Who pays the fee?" done>
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">Withdrawal fee option</legend>
                  <FeeOption checked={feeMode === "FEE_ON_TOP"} onSelect={() => { setFeeMode("FEE_ON_TOP"); resetRequestKey(); }}
                    title="I cover the fee" body="Recipient gets the full amount. The fee is added to what leaves your wallet." />
                  <FeeOption checked={feeMode === "DEDUCT_FROM_AMOUNT"} onSelect={() => { setFeeMode("DEDUCT_FROM_AMOUNT"); resetRequestKey(); }}
                    title="Deduct from amount" body="Your wallet is charged exactly what you entered. The fee comes out of what the recipient gets." />
                </fieldset>
              </Step>
            </div>
          </section>

          {/* ---------- RIGHT: summary / authorization ---------- */}
          <aside className="space-y-5 lg:sticky lg:top-4">
            {pendingAuthorization && (
              <form onSubmit={authorizeWithdrawal} className="rounded-2xl border border-ctex-blue/40 bg-ctex-blue/5 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-ctex-text"><ShieldCheck className="h-5 w-5 text-ctex-blue" aria-hidden="true" /><h3 className="font-semibold">Authorize this withdrawal</h3></div>
                <p className="mt-1 text-sm text-ctex-text-muted">Enter the code sent to your withdrawal email.</p>
                <label htmlFor="wd-code" className="sr-only">Withdrawal authorization code</label>
                <input id="wd-code" className={`${inputBase} mt-3 text-center text-xl tracking-[0.4em] tabular-nums`} inputMode="numeric"
                  autoComplete="one-time-code" maxLength={10} value={authorizationCode}
                  onChange={e => setAuthorizationCode(e.target.value.replace(/\D/g, ""))} />
                <button className="mt-3 w-full rounded-xl bg-ctex-blue px-4 py-3 font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 disabled:opacity-50"
                  disabled={busy || authorizationCode.length < 4}>{busy ? "Authorizing…" : "Authorize withdrawal"}</button>
              </form>
            )}

            <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-4 sm:p-5">
              <h3 className="text-lg font-semibold tracking-tight text-ctex-text">Summary</h3>
              {quoteReady ? <dl className="mt-4 space-y-3 text-sm text-ctex-text-muted">
                <SummaryRow label="Requested" value={money(quote.amount)} />
                <SummaryRow label="Fee" value={money(quote.feeAmount)} />
                <SummaryRow label="Wallet debit" value={money(quote.walletDebitAmount)} strong />
                <div className="rounded-xl bg-ctex-elevated p-4">
                  <dt className="text-xs text-ctex-text-muted">Recipient receives</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ctex-text">{money(quote.beneficiaryAmount)}</dd>
                  {beneficiary && <p className="mt-1 truncate text-xs text-ctex-text-muted">{beneficiary.accountName} · ••••{beneficiary.accountNumber.slice(-4)}</p>}
                </div>
                <button disabled={busy || !beneficiary} onClick={submitPayout}
                  className="w-full rounded-xl bg-ctex-blue px-4 py-3.5 font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? "Submitting…" : "Confirm withdrawal"}
                </button>
                {!beneficiary && <p className="text-center text-xs">Verify a bank account to continue.</p>}
              </dl> : (
                <div className="mt-4 flex gap-3 rounded-xl bg-ctex-elevated p-4 text-sm text-ctex-text-muted">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>Enter an amount of ₦100 or more to see the fee and what the recipient receives.</p>
                </div>
              )}
            </section>
          </aside>

          {payouts.length > 0 && (
            <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-4 sm:p-6 lg:col-span-2">
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-ctex-text">Recent withdrawals</h3>
              <ActivityList items={payouts} payout />
            </section>
          )}
        </div> : (
          <section className="rounded-2xl border border-ctex-border bg-ctex-surface p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-ctex-text">{isTransactions ? "Ledger activity" : "Recent ledger activity"}</h2>
            <ActivityList items={entries} />
          </section>
        )}
      </>}

      {/* Insufficient balance modal */}
      <InsufficientBalanceModal
        open={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        onWithdrawAvailable={handleWithdrawAvailable}
        walletDebit={Number(quote?.walletDebitAmount || 0)}
        availableBalance={Number(balance?.availableBalance || 0)}
        requestedAmount={Number(quote?.amount || 0)}
        feeAmount={Number(quote?.feeAmount || 0)}
        feeMode={feeMode}
        currency="NGN"
      />

      {/* Pending / authorization modal */}
      <PayoutPendingModal
        open={pendingModal.open}
        variant={pendingModal.variant}
        payout={pendingModal.payout}
        onClose={() => setPendingModal({ open: false, variant: "PROCESSING", payout: null })}
        onAuthorize={
          pendingModal.variant === "AUTHORIZATION"
            ? () => {
                setPendingModal({ open: false, variant: "PROCESSING", payout: null });
                setTimeout(() => {
                  document.getElementById("wd-code")?.focus();
                }, 100);
              }
            : undefined
        }
      />

      {/* Success modal */}
      <PayoutSuccessModal
        open={successModal.open}
        payout={successModal.payout}
        onClose={() => setSuccessModal({ open: false, payout: null })}
        onViewLedger={() => {
          setSuccessModal({ open: false, payout: null });
          window.location.assign("/merchant/dashboard/wallet/transactions");
        }}
      />
    </div>
  </DashboardLayout>;
}

/* =========================================================
 * BANK PICKER
 * ======================================================= */

function BankPicker({ banks, loading, failed, value, onSelect, onRetry }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(() => banks.find(b => b.code === value) || null, [banks, value]);

  const filtered = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return banks;
    return banks.filter(b => {
      const hay = `${b.name} ${b.code}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    });
  }, [banks, query]);

  const popular = useMemo(() => POPULAR_BANKS
    .map(([label, match]) => ({ label, bank: banks.find(b => b.name.trim().toLowerCase() === match) }))
    .filter(x => x.bank), [banks]);

  const close = useCallback(() => { setOpen(false); setQuery(""); setActive(0); }, []);

  const choose = useCallback((bank) => {
    if (!bank) return;
    onSelect(bank.code);
    close();
    triggerRef.current?.focus();
  }, [onSelect, close]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    const lock = window.matchMedia?.("(max-width: 639px)").matches;
    const previous = document.body.style.overflow;
    if (lock) document.body.style.overflow = "hidden";
    return () => { clearTimeout(timer); document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, Math.max(filtered.length - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(filtered[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); triggerRef.current?.focus(); }
  };

  if (failed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400">
        <span className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />We couldn’t load the list of banks.</span>
        <button type="button" onClick={onRetry} className="shrink-0 font-medium underline underline-offset-2">Retry</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button ref={triggerRef} type="button" disabled={loading} onClick={() => setOpen(true)}
        aria-haspopup="listbox" aria-expanded={open}
        className={`${inputBase} flex items-center justify-between gap-3 text-left disabled:cursor-wait disabled:opacity-70`}>
        <span className="flex min-w-0 items-center gap-3">
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-ctex-text-muted motion-reduce:animate-none" aria-hidden="true" />
            : selected ? <BankAvatar name={selected.name} /> : <Landmark className="h-5 w-5 text-ctex-text-muted" aria-hidden="true" />}
          <span className={`truncate ${selected ? "font-medium text-ctex-text" : "text-ctex-text-muted"}`}>
            {loading ? "Loading banks…" : selected ? selected.name : "Search and choose a bank"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ctex-text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && <>
        <div className="fixed inset-0 z-40 bg-black/60 sm:bg-transparent" onClick={() => { close(); }} aria-hidden="true" />
        <div role="dialog" aria-label="Choose a bank"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl border border-ctex-border bg-ctex-surface pb-[env(safe-area-inset-bottom)] shadow-2xl sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-[27rem] sm:rounded-2xl sm:pb-0">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ctex-border sm:hidden" aria-hidden="true" />
          <div className="flex items-center justify-between px-4 pb-2 pt-3 sm:hidden">
            <h3 className="font-semibold text-ctex-text">Choose a bank</h3>
            <button type="button" onClick={close} className="rounded-lg p-1.5 text-ctex-text-muted hover:bg-ctex-elevated" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>

          <div className="p-3 sm:pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ctex-text-muted" aria-hidden="true" />
              <input ref={inputRef} role="combobox" aria-expanded="true" aria-controls="bank-listbox"
                aria-activedescendant={filtered[active] ? `bank-opt-${active}` : undefined}
                aria-label="Search banks by name or code" autoComplete="off" spellCheck={false}
                className={`${inputBase} pl-9 pr-9`} placeholder="Type a bank name, e.g. Zenith" value={query}
                onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKeyDown} />
              {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setActive(0); inputRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ctex-text-muted hover:text-ctex-text"><X className="h-4 w-4" /></button>}
            </div>

            {!query && popular.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-ctex-text-muted">Popular</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
                  {popular.map(({ label, bank }) => (
                    <button key={bank.code} type="button" onClick={() => choose(bank)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${bank.code === value ? "border-ctex-blue bg-ctex-blue/10 text-ctex-blue" : "border-ctex-border text-ctex-text hover:border-ctex-blue/50 hover:bg-ctex-elevated"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ul ref={listRef} id="bank-listbox" role="listbox" aria-label="Banks"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ctex-border px-2 py-2">
            {filtered.length === 0 ? (
              <li className="px-3 py-10 text-center text-sm text-ctex-text-muted">
                No bank matches “{query.trim()}”. Check the spelling or try part of the name.
              </li>
            ) : filtered.map((bank, i) => {
              const letter = /[A-Z]/i.test(bank.name.trim()[0] || "") ? bank.name.trim()[0].toUpperCase() : "#";
              const prev = filtered[i - 1];
              const prevLetter = prev ? (/[A-Z]/i.test(prev.name.trim()[0] || "") ? prev.name.trim()[0].toUpperCase() : "#") : null;
              const isActive = i === active;
              return <li key={bank.code} role="presentation">
                {!query && letter !== prevLetter && (
                  <p className="sticky top-0 z-10 bg-ctex-surface px-3 pb-1 pt-3 text-xs font-semibold text-ctex-text-muted">{letter}</p>
                )}
                <button type="button" role="option" id={`bank-opt-${i}`} data-index={i}
                  aria-selected={bank.code === value} data-active={isActive}
                  onMouseMove={() => { if (!isActive) setActive(i); }} onClick={() => choose(bank)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${isActive ? "bg-ctex-elevated" : ""}`}>
                  <BankAvatar name={bank.name} />
                  <span className="min-w-0 flex-1 truncate text-ctex-text"><Highlight text={bank.name} query={query} /></span>
                  {bank.code === value && <Check className="h-4 w-4 shrink-0 text-ctex-blue" aria-hidden="true" />}
                </button>
              </li>;
            })}
          </ul>

          <p className="border-t border-ctex-border px-4 py-2 text-xs text-ctex-text-muted">
            {filtered.length === banks.length ? `${banks.length} banks` : `${filtered.length} of ${banks.length} banks`}
            <span className="hidden sm:inline"> · ↑ ↓ to move, Enter to select</span>
          </p>
        </div>
      </>}
    </div>
  );
}

function BankAvatar({ name }) {
  return <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ctex-elevated text-[11px] font-semibold text-ctex-text-muted ring-1 ring-ctex-border">{initials(name)}</span>;
}

function Highlight({ text, query }) {
  const q = query.trim().toLowerCase().split(/\s+/).filter(Boolean)[0];
  if (!q) return text;
  const index = text.toLowerCase().indexOf(q);
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark className="rounded bg-ctex-blue/20 px-0.5 text-ctex-text">{text.slice(index, index + q.length)}</mark>{text.slice(index + q.length)}</>;
}

/* =========================================================
 * BUILDING BLOCKS
 * ======================================================= */

function BalanceHero({ balance, showWithdraw }) {
  const available = Number(balance?.availableBalance || 0);
  const pending = Number(balance?.pendingBalance || 0);
  const base = available + pending;
  const availablePct = base > 0 ? Math.max(0, Math.min(100, (available / base) * 100)) : 0;
  return (
    <section className="mb-5 rounded-2xl border border-ctex-border bg-ctex-surface p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ctex-text-muted">Available to withdraw</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-ctex-text sm:text-5xl">{money(available)}</p>
        </div>
        {showWithdraw && (
          <Link to="/merchant/dashboard/wallet/withdraw"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ctex-blue px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50">
            Withdraw funds <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {base > 0 && (
        <div className="mt-5" role="img" aria-label={`${Math.round(availablePct)} percent of your balance is available`}>
          <div className="flex h-2 overflow-hidden rounded-full bg-ctex-elevated">
            <div className="bg-ctex-blue transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${availablePct}%` }} />
            <div className="bg-amber-400/70" style={{ width: `${100 - availablePct}%` }} />
          </div>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ctex-border pt-4 text-sm">
        <div>
          <dt className="flex items-center gap-2 text-ctex-text-muted"><span className="h-2 w-2 rounded-full bg-amber-400/70" aria-hidden="true" />Reserved</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-ctex-text">{money(balance?.pendingBalance)}</dd>
          <p className="text-xs text-ctex-text-muted">Held for withdrawals in progress</p>
        </div>
        <div>
          <dt className="text-ctex-text-muted">Total balance</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-ctex-text">{money(balance?.totalBalance)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Step({ n, title, done, children }) {
  return (
    <div className="py-6 first:pt-0 last:pb-0">
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition ${done ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30" : "bg-ctex-elevated text-ctex-text-muted ring-1 ring-ctex-border"}`}>
          {done ? <Check className="h-4 w-4" aria-hidden="true" /> : n}
        </span>
        <h3 className="font-medium text-ctex-text">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FeeOption({ checked, onSelect, title, body }) {
  return (
    <label className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 text-sm transition focus-within:ring-2 focus-within:ring-ctex-blue/40 ${checked ? "border-ctex-blue bg-ctex-blue/5" : "border-ctex-border hover:border-ctex-blue/40"}`}>
      <input type="radio" name="feeMode" className="sr-only" checked={checked} onChange={onSelect} />
      <span aria-hidden="true" className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${checked ? "border-ctex-blue" : "border-ctex-border"}`}>
        {checked && <span className="h-2 w-2 rounded-full bg-ctex-blue" />}
      </span>
      <span>
        <span className="block font-medium text-ctex-text">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-ctex-text-muted">{body}</span>
      </span>
    </label>
  );
}

function SummaryRow({ label, value, strong }) {
  return <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ctex-text" : ""}`}><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>;
}

function StatusBadge({ value }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${TONES[statusTone(value)]}`}>{sentenceCase(value)}</span>;
}

function Banner({ tone, onClose, children }) {
  const isError = tone === "error";
  return (
    <div role={isError ? "alert" : "status"}
      className={`mb-4 flex items-start gap-3 rounded-xl border p-3 text-sm ${isError ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
      {isError ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <p className="min-w-0 flex-1 break-words">{children}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="animate-pulse space-y-5 motion-reduce:animate-none" aria-busy="true" aria-label="Loading wallet">
      <div className="h-52 rounded-2xl bg-ctex-surface" />
      <div className="h-11 w-72 max-w-full rounded-2xl bg-ctex-surface" />
      <div className="h-72 rounded-2xl bg-ctex-surface" />
    </div>
  );
}

function ActivityList({ items, payout = false }) {
  if (!items?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ctex-elevated text-ctex-text-muted"><Receipt className="h-5 w-5" aria-hidden="true" /></span>
        <p className="font-medium text-ctex-text">No activity yet</p>
        <p className="max-w-xs text-sm text-ctex-text-muted">{payout ? "Withdrawals you make will appear here." : "Ledger entries appear here as payments settle."}</p>
      </div>
    );
  }
  return <>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-ctex-text-muted">
            <th className="py-2 pr-4 font-medium">Reference</th><th className="pr-4 font-medium">Type</th>
            <th className="pr-4 text-right font-medium">{payout ? "Wallet debit" : "Amount"}</th>
            {payout && <><th className="pr-4 text-right font-medium">C-TEX charge</th><th className="pr-4 text-right font-medium">Provider charge</th><th className="pr-4 text-right font-medium">Bank payout</th></>}
            <th className="pr-4 font-medium">Status</th><th className="font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map(row => (
            <tr key={row.id} className="border-t border-ctex-border text-ctex-text transition hover:bg-ctex-elevated/60">
              <td className="max-w-[14rem] truncate py-3 pr-4 font-mono text-xs" title={row.transaction?.reference || row.id}>{row.transaction?.reference || row.id}</td>
              <td className="pr-4">{payout ? "Withdrawal" : row.transaction?.type || "Ledger entry"}</td>
              <td className="pr-4 text-right tabular-nums">{money(row.walletDebitAmount ?? row.amount)}</td>
              {payout && <>
                <td className="pr-4 text-right tabular-nums">{money(row.feeAmount)}</td>
                <td className="pr-4 text-right tabular-nums">{row.providerFeeReported == null ? <span className="text-ctex-text-muted">Not reported</span> : money(row.providerFeeReported)}</td>
                <td className="pr-4 text-right tabular-nums">{money(row.beneficiaryAmount ?? row.amount)}</td>
              </>}
              <td className="pr-4"><StatusBadge value={row.status || row.direction} /></td>
              <td className="whitespace-nowrap text-ctex-text-muted">{new Date(row.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <ul className="space-y-3 md:hidden">
      {items.map(row => (
        <li key={row.id} className="rounded-xl border border-ctex-border bg-ctex-elevated/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ctex-text">{payout ? "Withdrawal" : row.transaction?.type || "Ledger entry"}</p>
              <p className="truncate font-mono text-xs text-ctex-text-muted">{row.transaction?.reference || row.id}</p>
            </div>
            <StatusBadge value={row.status || row.direction} />
          </div>
          <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-ctex-text">{money(row.walletDebitAmount ?? row.amount)}</p>
          {payout && (
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ctex-border pt-3 text-xs">
              <div><dt className="text-ctex-text-muted">C-TEX charge</dt><dd className="mt-0.5 tabular-nums text-ctex-text">{money(row.feeAmount)}</dd></div>
              <div><dt className="text-ctex-text-muted">Provider charge</dt><dd className="mt-0.5 tabular-nums text-ctex-text">{row.providerFeeReported == null ? "Not reported" : money(row.providerFeeReported)}</dd></div>
              <div><dt className="text-ctex-text-muted">Bank payout</dt><dd className="mt-0.5 tabular-nums text-ctex-text">{money(row.beneficiaryAmount ?? row.amount)}</dd></div>
            </dl>
          )}
          <p className="mt-3 text-xs text-ctex-text-muted">{new Date(row.createdAt).toLocaleString()}</p>
        </li>
      ))}
    </ul>

    {payout && <p className="mt-3 text-xs text-ctex-text-muted">Provider payout charges are shown only when the provider reports them; they are not included in the C-TEX charge.</p>}
  </>;
}