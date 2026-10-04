import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useApiKeyStore } from "../../store/apiKey.store";
import { usePermissionStore } from "../../store/permission.store";
import { hasPermission } from "../../utils/permissions";
import RevealKeyModal from "../../components/apikeys/RevealKeyModal";

const navSections = [{
  title: "Overview",
  items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/merchant/dashboard" },
    { key: "api-keys", label: "API Keys", icon: "apiKeys", path: "/merchant/dashboard/api-keys" },
    { key: "webhooks", label: "Webhooks", icon: "webhooks", path: "/merchant/dashboard/webhooks" },
    { key: "business-profile", label: "Business Profile", icon: "business", path: "/merchant/dashboard/business" },
  ],
}];

export default function ApiKeysPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions, getMyMembership } = useMerchantStore();
  const { permissions: catalogue, getPermissions } = usePermissionStore();
  const {
    apiKeys,
    newlyCreatedKey,
    isLoading,
    error,
    getApiKeys,
    createApiKey,
    rotateApiKey,
    revokeApiKey,
    clearNewlyCreatedKey,
    clearError,
  } = useApiKeyStore();

  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("TEST");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [expiresAt, setExpiresAt] = useState("");

  // which key is being revealed
  const [revealing, setRevealing] = useState(null);

  // select-all checkbox ref (for indeterminate state)
  const selectAllRef = useRef(null);

  useEffect(() => {
    getApiKeys();
    if (permissions.length === 0) getMyMembership();
    getPermissions();
  }, [getApiKeys, getMyMembership, getPermissions, permissions.length]);

  const canCreate = hasPermission(permissions, "api_keys.create");
  const canManage =
    hasPermission(permissions, "api_keys.manage") ||
    roles.some((role) => role.name === "OWNER");

  // Only owners can reveal secrets (backend enforces this too)
  const isOwner = roles.some((role) => role.name === "OWNER");

  const displayName = useMemo(
    () => `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Merchant Admin",
    [user]
  );

  const allKeys = useMemo(() => catalogue.map((permission) => permission.key), [catalogue]);
  const selectedCount = useMemo(
    () => allKeys.filter((key) => selectedPermissions.includes(key)).length,
    [allKeys, selectedPermissions]
  );
  const allSelected = allKeys.length > 0 && selectedCount === allKeys.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const togglePermission = (key) => {
    setSelectedPermissions((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    );
  };

  const toggleAllPermissions = () => {
    setSelectedPermissions(allSelected ? [] : allKeys);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    clearError();
    if (!name.trim()) {
      toast.error("API key name is required.");
      return;
    }
    const result = await createApiKey({
      name: name.trim(),
      environment,
      permissionKeys: selectedPermissions,
      expiresAt: expiresAt || null,
    });
    if (result.success) {
      toast.success("API key created. Copy the secret now; it will not be shown again.");
      setName("");
      setSelectedPermissions([]);
      setExpiresAt("");
    } else toast.error(result.message || "Unable to create API key.");
  };

  const handleRotate = async (id) => {
    if (!window.confirm("Rotate this API key? The current key will be revoked.")) return;
    const result = await rotateApiKey(id);
    if (result.success) toast.success("API key rotated. Copy the new secret now.");
    else toast.error(result.message || "Unable to rotate API key.");
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revoke this API key? This action cannot be undone.")) return;
    const result = await revokeApiKey(id);
    if (result.success) toast.success("API key revoked.");
    else toast.error(result.message || "Unable to revoke API key.");
  };

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="API keys"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles[0]?.name}
    >
      {newlyCreatedKey && (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-500">
                Copy this secret key now
              </p>
              <p className="mt-1 break-all font-mono text-xs text-ctex-text">
                {newlyCreatedKey}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(newlyCreatedKey)}
              className="rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-500"
            >
              Copy key
            </button>
          </div>
          <button
            type="button"
            onClick={clearNewlyCreatedKey}
            className="mt-3 text-xs text-ctex-text-muted underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {canCreate && (
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10"
          >
            <h2 className="text-lg font-semibold text-ctex-text">Create API key</h2>
            <p className="mt-1 text-sm text-ctex-text-muted">
              Use separate keys for test and live integrations.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                {error}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Key name"
                maxLength={100}
                className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue"
              />
              <select
                value={environment}
                onChange={(event) => setEnvironment(event.target.value)}
                className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue"
              >
                <option value="TEST">Test</option>
                <option value="LIVE">Live</option>
              </select>
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue"
              />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                    Permissions
                  </p>
                  {catalogue.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ctex-text-muted hover:text-ctex-blue">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAllPermissions}
                      />
                      Select all
                      <span className="text-ctex-text-muted/70">
                        ({selectedCount}/{catalogue.length})
                      </span>
                    </label>
                  )}
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {catalogue.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-center gap-2 text-xs text-ctex-text-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.key)}
                        onChange={() => togglePermission(permission.key)}
                      />
                      {permission.name || permission.key}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-ctex-blue-light disabled:opacity-60"
              >
                {isLoading ? "Creating..." : "Create API key"}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ctex-text">Your API keys</h2>
              <p className="mt-1 text-sm text-ctex-text-muted">
                Secrets are only displayed once.
              </p>
            </div>
            <span className="rounded-full bg-ctex-elevated px-3 py-1 text-xs text-ctex-text-muted">
              {apiKeys.length} total
            </span>
          </div>

          <div className="space-y-3">
            {apiKeys.length === 0 && !isLoading ? (
              <p className="rounded-xl border border-dashed border-ctex-border p-8 text-center text-sm text-ctex-text-muted">
                No API keys found.
              </p>
            ) : (
              apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="rounded-xl border border-ctex-border bg-ctex-elevated/50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-ctex-text">
                        {key.name || "Unnamed key"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-ctex-text-muted">
                        {key.prefix || key.keyPrefix || "••••••••"} ·{" "}
                        {key.environment || "TEST"}
                      </p>
                      <p className="mt-1 text-xs text-ctex-text-muted">
                        {key.status || "ACTIVE"}
                        {key.expiresAt
                          ? ` · expires ${new Date(key.expiresAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Reveal — owner-only, ACTIVE keys only */}
                      {isOwner && key.status === "ACTIVE" && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setRevealing(key)}
                          className="rounded-lg border border-ctex-border px-3 py-1.5 text-xs text-ctex-text-muted hover:border-ctex-blue hover:text-ctex-blue disabled:opacity-50"
                        >
                          Reveal
                        </button>
                      )}

                      {canManage && (
                        <>
                          <button
                            type="button"
                            disabled={key.status !== "ACTIVE" || isLoading}
                            onClick={() => handleRotate(key.id)}
                            className="rounded-lg border border-ctex-border px-3 py-1.5 text-xs text-ctex-text-muted hover:border-ctex-blue hover:text-ctex-blue disabled:opacity-50"
                          >
                            Rotate
                          </button>
                          <button
                            type="button"
                            disabled={key.status !== "ACTIVE" || isLoading}
                            onClick={() => handleRevoke(key.id)}
                            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-500 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reveal modal */}
      <RevealKeyModal
        open={!!revealing}
        apiKey={revealing}
        onClose={() => setRevealing(null)}
      />
    </DashboardLayout>
  );
}