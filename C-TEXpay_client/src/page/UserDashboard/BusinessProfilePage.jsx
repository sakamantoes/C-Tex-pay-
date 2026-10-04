import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMerchantStore } from "../../store/merchant.store";

export default function UserBusinessProfilePage() {
  const {
    ownedMerchant,
    ownedBusinessProfile,
    memberships,
    isLoading,
    getOwnedBusinessProfile,
  } = useMerchantStore();

  /*
  |--------------------------------------------------------------------------
  | Bootstrap
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    getOwnedBusinessProfile().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownsMerchant = Boolean(ownedMerchant);
  const displayProfile = ownedBusinessProfile;

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */
  if (isLoading && !displayProfile) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-ctex-elevated" />
        <div className="h-64 animate-pulse rounded-2xl bg-ctex-elevated" />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | No business at all
  |--------------------------------------------------------------------------
  */
  if (!displayProfile) {
    return (
      <div className="rounded-2xl border border-dashed border-ctex-border bg-ctex-surface/50 px-6 py-16 text-center">
        <p className="text-sm font-medium text-ctex-text">
          No business yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-xs text-ctex-text-muted">
          {memberships.length > 0
            ? "You have team access in another workspace. Create your own merchant account to manage a separate business."
            : "You have not created your own merchant account yet."}
        </p>
        <Link
          to="/user/dashboard/create-business"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ctex-blue px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light"
        >
          Create your business →
        </Link>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Invited member (read-only) — show business profile as reference,
  | but no edit capabilities
  |--------------------------------------------------------------------------
  */
  const isOwner = ownsMerchant;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-ctex-blue">
              {isOwner ? "Business profile" : "Business you belong to"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ctex-text">
              {displayProfile.businessName}
            </h2>
            <p className="mt-1 text-sm text-ctex-text-muted">
              {displayProfile.businessType || "—"} ·{" "}
              {displayProfile.country || "—"}
            </p>
          </div>

          {!isOwner && (
            <span className="self-start rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-500">
              Read-only · You are a team member
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Info label="Email" value={displayProfile.email} />
          <Info label="Phone" value={displayProfile.phone} />
          <Info label="Website" value={displayProfile.website} />
          <Info label="Country" value={displayProfile.country} />
          <Info label="State" value={displayProfile.state} />
          <Info label="City" value={displayProfile.city} />
          <Info label="Address" value={displayProfile.address} />
          <Info label="Description" value={displayProfile.description} />
        </dl>

        {isOwner && (
          <div className="mt-6 flex justify-end">
            <Link
              to="/merchant/dashboard/business"
              className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light"
            >
              Edit business profile
            </Link>
          </div>
        )}

        {!isOwner && (
          <p className="mt-4 text-xs text-ctex-text-muted">
            Only the business owner can edit this profile.
          </p>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ctex-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-ctex-text">
        {value || "—"}
      </dd>
    </div>
  );
}