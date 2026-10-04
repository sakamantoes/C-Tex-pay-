import { useAuthStore } from "../../store/auth.store";

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6">
        <h2 className="text-lg font-semibold text-ctex-text">My profile</h2>
        <p className="mt-1 text-sm text-ctex-text-muted">
          Your personal account information.
        </p>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <Info label="First name" value={user.firstName} />
          <Info label="Last name" value={user.lastName} />
          <Info label="Email" value={user.email} />
          <Info label="Phone" value={user.phone || "—"} />
          <Info label="Role" value={user.role} />
          <Info
            label="Status"
            value={user.status}
            tone={user.status === "ACTIVE" ? "success" : "warning"}
          />
          <Info
            label="Email verified"
            value={user.emailVerified ? "Yes" : "No"}
            tone={user.emailVerified ? "success" : "warning"}
          />
          <Info
            label="Last login"
            value={
              user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : "—"
            }
          />
        </dl>
      </div>
    </div>
  );
}

function Info({ label, value, tone = "neutral" }) {
  const toneClass = {
    success: "text-emerald-500",
    warning: "text-amber-500",
    neutral: "text-ctex-text",
  }[tone];

  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ctex-text-muted">
        {label}
      </dt>
      <dd className={`mt-1 text-sm font-medium ${toneClass}`}>
        {value || "—"}
      </dd>
    </div>
  );
}