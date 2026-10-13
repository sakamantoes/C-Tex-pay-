import { useEffect, useState } from "react";
import paymentLinkService from "../../service/paymentLink.service";

const MIN_NAIRA = 50;
const MAX_NAIRA = 10_000_000;

function nairaToKobo(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function koboToNaira(value) {
  if (value === null || value === undefined) return "";
  return (Number(value) / 100).toFixed(2);
}

/**
 * PaymentLinkFormModal
 *
 * Props:
 *   open       — boolean
 *   linkId     — null for create, string UUID for edit
 *   onClose    — called when the user dismisses the modal
 *   onSuccess  — called after a successful save (with the saved link)
 */
export default function PaymentLinkFormModal({
  open,
  linkId = null,
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(linkId);

  const [form, setForm] = useState({
    title: "",
    description: "",
    amountType: "FIXED",
    amountNaira: "",
    allowMultiplePayments: true,
    expiresAt: "",
    status: "ACTIVE",
  });

  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Reset / load when opened
  useEffect(() => {
    if (!open) return;
    setLoadError(null);
    setSubmitError(null);

    if (!isEdit) {
      setForm({
        title: "",
        description: "",
        amountType: "FIXED",
        amountNaira: "",
        allowMultiplePayments: true,
        expiresAt: "",
        status: "ACTIVE",
      });
      return;
    }

    (async () => {
      try {
        const result = await paymentLinkService.get(linkId);
        const link = result.data.link;
        setForm({
          title: link.title || "",
          description: link.description || "",
          amountType: link.amountType,
          amountNaira:
            link.amountType === "FIXED" ? koboToNaira(link.amount) : "",
          allowMultiplePayments: link.allowMultiplePayments,
          expiresAt: link.expiresAt
            ? new Date(link.expiresAt).toISOString().slice(0, 10)
            : "",
          status: link.status,
        });
      } catch (error) {
        setLoadError(
          error?.response?.data?.message || "Failed to load link"
        );
      }
    })();
  }, [open, isEdit, linkId]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleChange = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    if (!form.title.trim()) return "Title is required";
    if (form.title.length > 120) return "Title is too long";
    if (form.description.length > 500) return "Description is too long";
    if (form.amountType === "FIXED") {
      const naira = Number(form.amountNaira);
      if (!Number.isFinite(naira) || naira <= 0)
        return "Amount is required for fixed links";
      if (naira < MIN_NAIRA)
        return `Minimum amount is ₦${MIN_NAIRA.toLocaleString()}`;
      if (naira > MAX_NAIRA)
        return `Maximum amount is ₦${MAX_NAIRA.toLocaleString()}`;
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    const localError = validate();
    if (localError) {
      setSubmitError(localError);
      return;
    }

    setSubmitting(true);
    try {
      let result;
      if (isEdit) {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          allowMultiplePayments: form.allowMultiplePayments,
          expiresAt: form.expiresAt
            ? new Date(`${form.expiresAt}T23:59:59.000Z`).toISOString()
            : null,
          status: form.status,
        };
        if (form.amountType === "FIXED") {
          payload.amount = nairaToKobo(form.amountNaira);
        }
        result = await paymentLinkService.update(linkId, payload);
      } else {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          amountType: form.amountType,
          allowMultiplePayments: form.allowMultiplePayments,
          expiresAt: form.expiresAt
            ? new Date(`${form.expiresAt}T23:59:59.000Z`).toISOString()
            : null,
        };
        if (form.amountType === "FIXED") {
          payload.amount = nairaToKobo(form.amountNaira);
        }
        result = await paymentLinkService.create(payload);
      }
      onSuccess?.(result?.data?.link || null);
      onClose?.();
    } catch (error) {
      const fields = error?.response?.data?.fields;
      if (fields && typeof fields === "object") {
        const first = Object.values(fields)[0];
        setSubmitError(typeof first === "string" ? first : "Validation failed");
      } else {
        setSubmitError(
          error?.response?.data?.message || "Failed to save payment link"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Payment Link" : "Create Payment Link"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loadError && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {loadError}
          </div>
        )}

        {!loadError && (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
            <Field label="Title" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Consultation fee"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="What is this payment for?"
              />
            </Field>

            {!isEdit && (
              <Field label="Amount type" required>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="amountType"
                      checked={form.amountType === "FIXED"}
                      onChange={() => handleChange("amountType", "FIXED")}
                    />
                    Fixed
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="amountType"
                      checked={form.amountType === "CUSTOM"}
                      onChange={() => handleChange("amountType", "CUSTOM")}
                    />
                    Customer enters
                  </label>
                </div>
              </Field>
            )}

            {form.amountType === "FIXED" && (
              <Field label="Amount (NGN)" required>
                <input
                  type="number"
                  min={MIN_NAIRA}
                  max={MAX_NAIRA}
                  step="0.01"
                  value={form.amountNaira}
                  onChange={(e) =>
                    handleChange("amountNaira", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 5000.00"
                />
              </Field>
            )}

            <Field label="Multiple payments">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.allowMultiplePayments}
                  onChange={(e) =>
                    handleChange("allowMultiplePayments", e.target.checked)
                  }
                />
                Allow multiple successful payments
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Turn off to make this a single-use link.
              </p>
            </Field>

            <Field label="Expires on (optional)">
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => handleChange("expiresAt", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>

            {isEdit && (
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </Field>
            )}

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create link"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}