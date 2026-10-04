import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";

const initialForm = {
  businessName: "",
  businessType: "",
  email: "",
  phone: "",
  website: "",
  description: "",
  country: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

export default function CreateBusinessPage() {
  const navigate = useNavigate();
  const { user, getMe } = useAuthStore();
  const { createMerchant, isLoading } = useMerchantStore();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayName = useMemo(() => {
    const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return name || user?.email || "there";
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.businessName.trim()) {
      toast.error("Business name is required.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      businessName: form.businessName.trim(),
      businessType: form.businessType.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      description: form.description.trim() || undefined,
      country: form.country.trim() || undefined,
      addressLine1: form.addressLine1.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined,
    };

    const result = await createMerchant(payload);

    if (!result.success) {
      toast.error(result.message || "Unable to create your business right now.");
      setIsSubmitting(false);
      return;
    }

    try {
      await getMe();
      toast.success("Business created. Redirecting to your merchant dashboard.");
      navigate("/merchant/dashboard", { replace: true });
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Business created, but your account refresh failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6">
        <Link
          to="/user/dashboard/overview"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ctex-text-muted transition hover:text-ctex-blue"
        >
          ← Back to overview
        </Link>
        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ctex-blue">
          Merchant onboarding
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ctex-text">
          Welcome, {displayName}
        </h2>
        <p className="mt-1 text-sm text-ctex-text-muted">
          Create your business to become a merchant and unlock your merchant
          dashboard.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              label="Business name"
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              placeholder="C-TEX PAY Solutions"
              required
            />
          </div>

          <Field
            label="Business type"
            name="businessType"
            value={form.businessType}
            onChange={handleChange}
            placeholder="LLC, Corporation…"
          />
          <Field
            label="Business email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="hello@business.com"
          />

          <Field
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+1 555 000 0000"
          />
          <Field
            label="Website"
            name="website"
            value={form.website}
            onChange={handleChange}
            placeholder="https://example.com"
          />

          <Field
            label="Country"
            name="country"
            value={form.country}
            onChange={handleChange}
            placeholder="United States"
          />
          <Field
            label="City"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="New York"
          />

          <Field
            label="State"
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="NY"
          />
          <Field
            label="Postal code"
            name="postalCode"
            value={form.postalCode}
            onChange={handleChange}
            placeholder="10001"
          />

          <div className="md:col-span-2">
            <Field
              label="Address"
              name="addressLine1"
              value={form.addressLine1}
              onChange={handleChange}
              placeholder="Street address"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us a bit about your business."
              className="w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 py-2.5 text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            to="/user/dashboard/overview"
            className="rounded-xl border border-ctex-border bg-ctex-surface px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting || isLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Creating…
              </>
            ) : (
              "Create your business"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
        {label}
      </label>
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
      />
    </div>
  );
}