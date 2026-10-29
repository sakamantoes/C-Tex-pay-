import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useRoleStore } from "../../store/role.store";
import { usePermissionStore } from "../../store/permission.store";
import { hasPermission } from "../../utils/permissions";
import RoleFormModal from "../../components/roles/RoleFormModal";
import DeleteRoleModal from "../../components/roles/DeleteRoleModal";
import PermissionDrawer from "../../components/roles/PermissionDrawer";
import { buildMerchantNav } from "./merchantNav";

/* --------------------------------------------------------------------------
   BRAND TONES (shared with MerchantDashboard)
   -------------------------------------------------------------------------- */
const TONES = {
  blue: {
    background: "linear-gradient(135deg,#2f95de,#0B68AD)",
    boxShadow: "0 10px 22px -10px #0B68AD",
  },
  green: {
    background: "linear-gradient(135deg,#22C55E,#15803D)",
    boxShadow: "0 10px 22px -10px #15803D",
  },
  orange: {
    background: "linear-gradient(135deg,#FBBF24,#EA580C)",
    boxShadow: "0 10px 22px -10px #EA580C",
  },
  oxblood: {
    background: "linear-gradient(135deg,#9F1239,#4C0519)",
    boxShadow: "0 10px 22px -10px #7F1D1D",
  },
};

const HERO_BG = "linear-gradient(160deg,#2f95de 0%,#0B68AD 100%)";

/* --------------------------------------------------------------------------
   PAGE
   -------------------------------------------------------------------------- */
export default function RolesPage() {
  const { user } = useAuthStore();
  const { roles: myRoles, permissions, businessProfile, getMyMembership } =
    useMerchantStore();
  const { getPermissions } = usePermissionStore();

  const {
    roles,
    isLoading,
    error,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    clearError,
  } = useRoleStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [managingPermissions, setManagingPermissions] = useState(null);

  useEffect(() => {
    if (permissions.length === 0) getMyMembership();
    getRoles();
    getPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navSections = useMemo(
    () => buildMerchantNav(permissions),
    [permissions]
  );

  const canManage = hasPermission(permissions, "roles.manage");

  const stats = useMemo(() => {
    const custom = roles.filter((r) => !r.isSystemRole).length;
    const system = roles.filter((r) => r.isSystemRole).length;
    const totalPermissionsGranted = roles.reduce(
      (sum, r) => sum + (r.permissions?.length || 0),
      0
    );
    return { total: roles.length, custom, system, totalPermissionsGranted };
  }, [roles]);

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
    clearError();
  };

  const handleEdit = (role) => {
    setEditing(role);
    setFormOpen(true);
    clearError();
  };

  const handleFormSubmit = async (payload) => {
    if (editing) {
      const res = await updateRole(editing.id, payload);
      if (res.success) {
        setFormOpen(false);
        setEditing(null);
      }
      return res;
    }
    const res = await createRole(payload);
    if (res.success) setFormOpen(false);
    return res;
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    const res = await deleteRole(deleting.id);
    if (res.success) setDeleting(null);
  };

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || "Merchant Admin"
    : "Merchant Admin";

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Roles & permissions"
      navSections={navSections}
      profileName={displayName}
      profileRole={myRoles[0]?.name || "Member"}
    >
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[28px] p-5 text-white sm:p-6 lg:p-8"
        style={{ background: HERO_BG }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/70 sm:text-[11px]">
              Access control
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              Roles &amp; permissions
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Define roles and control what each team member can access.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
              <HeroPill icon={Shield}>
                {stats.total} role{stats.total === 1 ? "" : "s"}
              </HeroPill>
              <HeroPill icon={Users}>
                {stats.custom} custom · {stats.system} system
              </HeroPill>
              <HeroPill icon={BadgeCheck}>
                {stats.totalPermissionsGranted} grants
              </HeroPill>
            </div>
          </div>

          {canManage && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0B3E66] transition hover:-translate-y-px hover:bg-white/90"
              >
                <Plus className="h-4 w-4" />
                Create role
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ─── STATS ────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MiniStat
          label="Total roles"
          value={stats.total}
          loading={isLoading}
          tone="blue"
          icon={Shield}
        />
        <MiniStat
          label="Custom roles"
          value={stats.custom}
          loading={isLoading}
          tone="orange"
          icon={Pencil}
        />
        <MiniStat
          label="System roles"
          value={stats.system}
          loading={isLoading}
          tone="oxblood"
          icon={BadgeCheck}
        />
        <MiniStat
          label="Permissions granted"
          value={stats.totalPermissionsGranted}
          loading={isLoading}
          tone="green"
          icon={CheckIcon}
        />
      </div>

      {/* ─── ERROR ────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ROLE LIST ───────────────────────────────────────── */}
      <div className="mt-5">
        {isLoading && roles.length === 0 ? (
          <RoleSkeletons />
        ) : roles.length === 0 ? (
          <EmptyState onCreate={canManage ? handleCreate : undefined} />
        ) : (
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  canManage={canManage}
                  onEdit={() => handleEdit(role)}
                  onDelete={() => setDeleting(role)}
                  onManagePermissions={() => setManagingPermissions(role)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {canManage && roles.length > 0 && (
        <p className="mt-4 text-xs text-ctex-text-muted">
          Tip: system roles (like OWNER) cannot be edited or deleted. Roles
          assigned to members cannot be deleted until you unassign them.
        </p>
      )}

      {/* Modals */}
      <RoleFormModal
        open={formOpen}
        role={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          clearError();
        }}
        onSubmit={handleFormSubmit}
        isSaving={isLoading}
      />

      <DeleteRoleModal
        open={!!deleting}
        role={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isLoading}
      />

      <PermissionDrawer
        open={!!managingPermissions}
        role={managingPermissions}
        canManage={canManage}
        onClose={() => {
          setManagingPermissions(null);
          clearError();
        }}
      />
    </DashboardLayout>
  );
}

/* --------------------------------------------------------------------------
   SUB-COMPONENTS
   -------------------------------------------------------------------------- */

function HeroPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-white/80" />
      {children}
    </span>
  );
}

function MiniStat({ label, value, loading, tone = "blue", icon: Icon }) {
  return (
    <div className="rounded-[24px] border border-ctex-border bg-ctex-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={TONES[tone]}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-ctex-text-muted">
        {label}
      </p>
      {loading ? (
        <div className="mt-1.5 h-7 w-12 animate-pulse rounded bg-ctex-panel" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ctex-text">
          {value}
        </p>
      )}
    </div>
  );
}

function RoleCard({ role, canManage, onEdit, onDelete, onManagePermissions }) {
  const isSystem = role.isSystemRole;
  const permissionCount = role.permissions?.length || 0;
  const chipTone = isSystem ? "oxblood" : "blue";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col rounded-[28px] border border-ctex-border bg-ctex-surface p-5 transition hover:border-ctex-accent/30"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={TONES[chipTone]}
          >
            <Shield className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-ctex-text">
                {role.name}
              </h3>
              {isSystem && (
                <span className="flex-shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-500">
                  System
                </span>
              )}
            </div>
            {role.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-ctex-text-muted">
                {role.description}
              </p>
            )}
          </div>
        </div>

        {canManage && !isSystem && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full p-2 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-accent"
              aria-label="Edit role"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full p-2 text-ctex-text-muted transition hover:bg-red-500/10 hover:text-red-500"
              aria-label="Delete role"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="rounded-full bg-ctex-panel px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ctex-text-muted">
          {permissionCount} permission{permissionCount === 1 ? "" : "s"}
        </span>
      </div>

      {permissionCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {role.permissions.slice(0, 6).map((p) => (
            <span
              key={p.id}
              className="rounded-full border border-ctex-border bg-ctex-panel/60 px-2 py-0.5 text-[10px] font-medium text-ctex-text-muted"
            >
              {p.key}
            </span>
          ))}
          {permissionCount > 6 && (
            <span className="rounded-full border border-ctex-border bg-ctex-panel/60 px-2 py-0.5 text-[10px] font-medium text-ctex-text-muted">
              +{permissionCount - 6} more
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onManagePermissions}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ctex-border bg-ctex-panel/60 px-3 py-2 text-xs font-medium text-ctex-text transition hover:border-ctex-accent/40 hover:text-ctex-accent"
        >
          {canManage && !isSystem ? "Manage permissions" : "View permissions"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="rounded-[28px] border border-dashed border-ctex-border bg-ctex-surface/50 px-6 py-12 text-center sm:py-16">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={TONES.blue}
        >
          <Shield className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <p className="text-sm font-semibold text-ctex-text">No roles yet</p>
        <p className="text-xs text-ctex-text-muted">
          Create roles to control what your team members can access.
        </p>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-ctex-accent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            Create your first role
          </button>
        )}
      </div>
    </div>
  );
}

function RoleSkeletons() {
  return (
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-[28px] border border-ctex-border bg-ctex-surface p-5"
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-ctex-panel" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-ctex-panel" />
              <div className="h-3 w-48 animate-pulse rounded bg-ctex-panel" />
            </div>
          </div>
          <div className="mb-4 flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-ctex-panel" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-ctex-panel" />
          </div>
          <div className="mt-4 h-9 w-full animate-pulse rounded-full bg-ctex-panel" />
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   INLINE ICONS
   -------------------------------------------------------------------------- */

function CheckIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}