import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import checkoutService from "../../service/checkout.service";

import CheckoutShell from "./checkout/CheckoutShell";
import CheckoutLoading from "./checkout/CheckoutLoading";
import CheckoutError from "./checkout/CheckoutError";
import TransferInstructions from "./checkout/TransferInstructions";
import PaymentStatusView from "./checkout/PaymentStatusView";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const TERMINAL_STATUSES = new Set([
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
]);

/**
 * Direct hosted checkout entry point.
 *
 * Used by merchants who initialize a payment via their own backend
 * and redirect the customer here. Bypasses CheckoutForm entirely —
 * the payment already exists, we just need to show the instructions.
 *
 * When the payment reaches a terminal state AND the backend returned
 * a redirectUrl, the customer is automatically sent back to the
 * merchant's configured destination after a short delay.
 *
 * Route: /checkout/:token
 */
export default function DirectCheckoutPage() {
  const { token } = useParams();

  const [phase, setPhase] = useState("loading"); // loading | instructions | status | error
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);

  const pollTimerRef = useRef(null);
  const pollStartedAtRef = useRef(null);
  const redirectHandledRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPollingActive(false);
  }, []);

  const startPolling = useCallback(() => {
    pollStartedAtRef.current = Date.now();
    setPollingActive(true);

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const result = await checkoutService.getByToken(token);
        const next = result.data;

        setPaymentData(next);

        if (TERMINAL_STATUSES.has(next.status)) {
          stopPolling();
          setPhase("status");
          return;
        }

        if (Date.now() - pollStartedAtRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
        }
      } catch {
        // Silent — poll again on next tick
      }
    }, POLL_INTERVAL_MS);
  }, [token, stopPolling]);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    stopPolling();
    redirectHandledRef.current = false;

    try {
      const result = await checkoutService.getByToken(token);
      const data = result.data;
      setPaymentData(data);

      if (data.status === "PENDING") {
        setPhase("instructions");
        startPolling();
      } else {
        setPhase("status");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "This checkout link is not available";
      setError(message);
      setPhase("error");
    }
  }, [token, startPolling, stopPolling]);

  useEffect(() => {
    load();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | Auto-redirect when payment reaches a terminal state
  |--------------------------------------------------------------------------
  | Only redirects when:
  |   - paymentData.redirectUrl is present (backend returned one)
  |   - the status is terminal (SUCCESS / FAILED / EXPIRED / CANCELLED)
  |   - we haven't already triggered a redirect for this page view
  |
  | Delay gives the customer a moment to see the confirmation before
  | being sent back to the merchant's site.
  */
  useEffect(() => {
    if (redirectHandledRef.current) return;
    if (!paymentData?.redirectUrl) return;

    const isTerminal = TERMINAL_STATUSES.has(paymentData.status);
    if (!isTerminal) return;

    redirectHandledRef.current = true;

    const delay = paymentData.status === "SUCCESS" ? 2500 : 1500;

    const t = setTimeout(() => {
      window.location.href = paymentData.redirectUrl;
    }, delay);

    return () => clearTimeout(t);
  }, [paymentData]);

  /* -------- Render states -------- */

  if (phase === "loading") {
    return (
      <CheckoutShell>
        <CheckoutLoading />
      </CheckoutShell>
    );
  }

  if (phase === "error") {
    return (
      <CheckoutShell>
        <CheckoutError
          title="Checkout unavailable"
          message={error}
          onRetry={load}
        />
      </CheckoutShell>
    );
  }

  const instructions = paymentData?.paymentInstructions || null;

  // Synthesize the `link` prop the existing components expect.
  // `description` becomes the heading; fallback to a generic label.
  const synthesizedLink = {
    title: paymentData?.description || "Payment",
    description: paymentData?.description || null,
  };

  const synthesizedCheckout = {
    paymentReference: paymentData?.paymentReference,
  };

  const synthesizedStatus = {
    status: paymentData?.status,
    amount: paymentData?.amount,
    currency: paymentData?.currency,
    paymentInstructions: instructions,
  };

  if (
    phase === "instructions" &&
    paymentData?.status === "PENDING" &&
    instructions
  ) {
    return (
      <CheckoutShell>
        <TransferInstructions
          link={synthesizedLink}
          checkout={synthesizedCheckout}
          paymentStatus={synthesizedStatus}
          instructions={instructions}
          pollingActive={pollingActive}
        />
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <PaymentStatusView
        link={synthesizedLink}
        checkout={synthesizedCheckout}
        paymentStatus={synthesizedStatus}
        redirectUrl={paymentData?.redirectUrl || null}
      />
    </CheckoutShell>
  );
}