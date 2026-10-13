import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import paymentLinkService from "../../service/paymentLink.service";

import CheckoutShell from "./checkout/CheckoutShell";
import CheckoutForm from "./checkout/CheckoutForm";
import TransferInstructions from "./checkout/TransferInstructions";
import PaymentStatusView from "./checkout/PaymentStatusView";
import CheckoutLoading from "./checkout/CheckoutLoading";
import CheckoutError from "./checkout/CheckoutError";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const TERMINAL_STATUSES = new Set([
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
]);

/**
 * MariaDB returns JSON columns as strings through Sequelize. Normalize
 * to a plain object so we can read properties safely.
 */
function parseInstructions(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export default function PaymentLinkCheckoutPage() {
  const { slug } = useParams();

  const [phase, setPhase] = useState("loading"); // loading | form | status | error
  const [error, setError] = useState(null);
  const [link, setLink] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const pollStartedAtRef = useRef(null);
  const pollTimerRef = useRef(null);
  const requestIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const loadLink = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const result = await paymentLinkService.getPublic(slug);
      setLink(result.data.link);
      setPhase("form");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "We couldn't find this payment link. Please check the URL and try again."
      );
      setPhase("error");
    }
  }, [slug]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPollingActive(false);
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(
    (paymentReference) => {
      pollStartedAtRef.current = Date.now();
      setPollingActive(true);

      pollTimerRef.current = setInterval(async () => {
        try {
          const result = await paymentLinkService.publicStatus(
            slug,
            paymentReference
          );
          const next = result.data;
          setPaymentStatus((prev) => ({
            ...next,
            paymentInstructions:
              parseInstructions(next.paymentInstructions) ||
              prev?.paymentInstructions ||
              null,
          }));

          if (TERMINAL_STATUSES.has(next.status)) {
            stopPolling();
          } else if (
            Date.now() - pollStartedAtRef.current >
            POLL_TIMEOUT_MS
          ) {
            stopPolling();
          }
        } catch {
          // Silently retry on next tick
        }
      }, POLL_INTERVAL_MS);
    },
    [slug, stopPolling]
  );

  const handleCheckout = useCallback(
    async ({ customer, amountNaira }) => {
      setSubmitting(true);
      setError(null);

      try {
        const payload = {
          customer: {
            firstName: customer.firstName.trim(),
            lastName: customer.lastName.trim(),
            email: customer.email.trim().toLowerCase(),
            phone: customer.phone?.trim() || null,
          },
          idempotencyKey: requestIdRef.current,
        };

        if (link.amountType === "CUSTOM") {
          const naira = Number(amountNaira);
          if (!Number.isFinite(naira) || naira <= 0) {
            throw new Error("Please enter a valid amount");
          }
          payload.amount = Math.round(naira * 100);
        }

        const result = await paymentLinkService.publicCheckout(slug, payload);
        const data = result.data;
        const instructions = parseInstructions(data.paymentInstructions);

        setCheckout({ ...data, paymentInstructions: instructions });
        setPaymentStatus({
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          paymentInstructions: instructions,
        });
        setPhase("status");
        startPolling(data.paymentReference);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to initialize payment. Please try again."
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [slug, link, startPolling]
  );

  /* -------- Render -------- */

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
          title="Payment link unavailable"
          message={error}
          onRetry={loadLink}
        />
      </CheckoutShell>
    );
  }

  if (phase === "form" && link) {
    return (
      <CheckoutShell>
        <CheckoutForm
          link={link}
          submitting={submitting}
          error={error}
          onSubmit={handleCheckout}
        />
      </CheckoutShell>
    );
  }

  if (phase === "status" && paymentStatus) {
    const status = paymentStatus.status;
    const instructions =
      checkout?.paymentInstructions ||
      paymentStatus.paymentInstructions ||
      null;

    if (status === "PENDING" && instructions) {
      return (
        <CheckoutShell>
          <TransferInstructions
            link={link}
            checkout={checkout}
            paymentStatus={paymentStatus}
            instructions={instructions}
            pollingActive={pollingActive}
          />
        </CheckoutShell>
      );
    }

    return (
      <CheckoutShell>
        <PaymentStatusView
          link={link}
          checkout={checkout}
          paymentStatus={paymentStatus}
        />
      </CheckoutShell>
    );
  }

  return null;
}