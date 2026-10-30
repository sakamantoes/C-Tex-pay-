
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import adminUserService from "../../service/adminUser.service";

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { user: currentUser } = useAuthStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [logoutReason, setLogoutReason] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);

  const navSections = useMemo(
    () => [
      {
        title: "Platform",
        items: [
          {
            key: "dashboard",
            label: "Dashboard",
            icon: "dashboard",
            path: "/super-admin/dashboard",
          },
          {
            key: "merchants",
            label: "Merchants",
            icon: "business",
            path: "/super-admin/merchants",
          },
          {
            key: "users",
            label: "Users",
            icon: "userCheck",
            path: "/super-admin/users",
          },
          {
            key: "transactions",
            label: "Transactions",
            icon: "transactions",
            path: "/super-admin/transactions",
          },
          {
            key: "audit-logs",
            label: "Audit logs",
            icon: "security",
            path: "/super-admin/audit-logs",
          },
        ],
      },
    ],
    []
  );

  /* =====================================================
   * LOAD USER
   * =================================================== */

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const result = await adminUserService.getUser(userId);

        if (!cancelled) {
          setData(result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e.response?.data?.message ||
              "Could not load user."
          );

          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (userId) {
      void loadUser();
    } else {
      setError("User ID is missing.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* =====================================================
   * FORCE LOGOUT
   * =================================================== */

  const handleForceLogout = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!logoutReason.trim() || logoutReason.trim().length < 8) {
      setError("Please provide a reason of at least 8 characters.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to force logout this user? All active sessions and refresh tokens will be revoked."
    );

    if (!confirmed) return;

    setLogoutLoading(true);

    try {
      const result = await adminUserService.forceLogout(
        userId,
        logoutReason
      );

      const revokedSessions =
        result.data?.sessionsRevoked ?? 0;

      const revokedTokens =
        result.data?.tokensRevoked ?? 0;

      // Update the displayed counts immediately.
      setData((previous) => ({
        ...previous,
        sessions: {
          ...previous.sessions,
          activeCount: Math.max(
            0,
            (previous.sessions?.activeCount ?? 0) - revokedSessions
          ),
          activeRefreshTokens: Math.max(
            0,
            (previous.sessions?.activeRefreshTokens ?? 0) - revokedTokens
          ),
        },
      }));

      setSuccess(
        `User logged out successfully. ${revokedSessions} session(s) and ${revokedTokens} refresh token(s) revoked.`
      );

      setLogoutReason("");
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to force logout this user."
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const u = data?.user;

  const isCurrentUser = currentUser?.id === userId;

  return (
    <DashboardLayout
      title="Super Admin"
      subtitle="User detail"
      navSections={navSections}
      profileName={
        `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
        "Super Admin"
      }
      profileRole={currentUser?.role}
    >
      <button
        onClick={() => navigate("/super-admin/users")}
        className="mb-3 text-xs text-ctex-blue hover:underline"
      >
        ← Back to users
      </button>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500"
        >
          {success}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ctex-text-muted">
          Loading user...
        </p>
      ) : !u ? (
        <p className="text-sm text-ctex-text-muted">
          User not found.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">

          {/* USER INFORMATION */}
          <div className="space-y-4">

            <div className="rounded-xl border border-ctex-border bg-ctex-surface p-5">
              <h2 className="text-base font-semibold text-ctex-text">
                {u.firstName} {u.lastName}
              </h2>

              <p className="mt-0.5 font-mono text-xs text-ctex-text-muted">
                {u.id}
              </p>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Email
                  </dt>
                  <dd className="font-mono text-ctex-text">
                    {u.email}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Phone
                  </dt>
                  <dd className="font-mono text-ctex-text">
                    {u.phone || "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Role
                  </dt>
                  <dd className="text-ctex-text">
                    {u.role}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Status
                  </dt>
                  <dd className="text-ctex-text">
                    {u.status}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Email verified
                  </dt>
                  <dd className="text-ctex-text">
                    {u.emailVerified ? "Yes" : "No"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Phone verified
                  </dt>
                  <dd className="text-ctex-text">
                    {u.phoneVerified ? "Yes" : "No"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Last login
                  </dt>
                  <dd className="text-ctex-text">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString()
                      : "Never"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-ctex-text-muted">
                    Created
                  </dt>
                  <dd className="text-ctex-text">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleString()
                      : "—"}
                  </dd>
                </div>

              </dl>
            </div>

            {/* FORCE LOGOUT */}
            <div className="rounded-xl border border-red-500/30 bg-ctex-surface p-5">

              <h3 className="text-sm font-semibold text-red-500">
                Force logout
              </h3>

              <p className="mt-1 text-xs text-ctex-text-muted">
                Revoke all active sessions and refresh tokens
                belonging to this user. The user will need to
                authenticate again.
              </p>

              {isCurrentUser ? (
                <p className="mt-3 text-xs text-amber-500">
                  You cannot force logout your own account.
                </p>
              ) : (
                <form
                  onSubmit={handleForceLogout}
                  className="mt-4 space-y-3"
                >
                  <textarea
                    value={logoutReason}
                    onChange={(e) =>
                      setLogoutReason(e.target.value)
                    }
                    placeholder="Enter the reason for forcing this user to logout..."
                    rows={3}
                    minLength={8}
                    required
                    className="w-full rounded-lg border border-ctex-border bg-ctex-elevated p-3 text-sm text-ctex-text outline-none focus:border-red-500"
                  />

                  <button
                    type="submit"
                    disabled={
                      logoutLoading ||
                      logoutReason.trim().length < 8
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {logoutLoading
                      ? "Revoking sessions..."
                      : "Force Logout User"}
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* SESSIONS AND MERCHANT MEMBERSHIPS */}
          <div className="rounded-xl border border-ctex-border bg-ctex-surface p-5">

            <h3 className="text-sm font-semibold text-ctex-text">
              Sessions
            </h3>

            <div className="mt-3 space-y-2 text-sm">

              <div className="flex justify-between text-ctex-text-muted">
                <span>Active sessions</span>
                <span className="font-mono text-ctex-text">
                  {data.sessions?.activeCount ?? 0}
                </span>
              </div>

              <div className="flex justify-between text-ctex-text-muted">
                <span>Active refresh tokens</span>
                <span className="font-mono text-ctex-text">
                  {data.sessions?.activeRefreshTokens ?? 0}
                </span>
              </div>

            </div>

            <h3 className="mt-5 text-sm font-semibold text-ctex-text">
              Merchant memberships
            </h3>

            {u.merchantMemberships?.length ? (
              <ul className="mt-2 space-y-2">
                {u.merchantMemberships.map((m) => (
                  <li
                    key={m.id}
                    className="rounded border border-ctex-border p-2 text-xs"
                  >
                    <p className="font-mono text-ctex-text">
                      {m.merchant?.merchantCode || "—"}
                    </p>

                    <p className="text-ctex-text-muted">
                      Membership: {m.status} · Merchant:{" "}
                      {m.merchant?.status || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-ctex-text-muted">
                Not a member of any merchant.
              </p>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
