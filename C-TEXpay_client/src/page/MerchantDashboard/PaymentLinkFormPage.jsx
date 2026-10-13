import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function PaymentLinkFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const result = await paymentLinkService.get(id);
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
  }, [id, isEdit]);

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
        await paymentLinkService.update(id, payload);
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
        await paymentLinkService.create(payload);
      }
      navigate("/merchant/dashboard/payment-links");
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

  if (loadError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/merchant/dashboard/payment-links")}
        className="text-sm text-indigo-600 hover:text-indigo-700 mb-4"
      >
        ← Back to Payment Links
      </button>

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {isEdit ? "Edit Payment Link" : "Create Payment Link"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            maxLength={120}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Consultation fee"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                Fixed amount
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="amountType"
                  checked={form.amountType === "CUSTOM"}
                  onChange={() => handleChange("amountType", "CUSTOM")}
                />
                Customer enters amount
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
              onChange={(e) => handleChange("amountNaira", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            Allow multiple successful payments on this link
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Turn off to make this a single-use link (auto-locks after the
            first successful payment).
          </p>
        </Field>

        <Field label="Expires on (optional)">
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => handleChange("expiresAt", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>

        {isEdit && (
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
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
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create link"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/merchant/dashboard/payment-links")}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}