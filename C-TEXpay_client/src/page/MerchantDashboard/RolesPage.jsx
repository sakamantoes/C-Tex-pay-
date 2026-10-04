import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useRoleStore } from "../../store/role.store";
import { usePermissionStore } from "../../store/permission.store";
import { hasPermission } from "../../utils/permissions";
import RoleFormModal from "../../components/roles/RoleFormModal";
import DeleteRoleModal from "../../components/roles/DeleteRoleModal";
import PermissionDrawer from "../../components/roles/PermissionDrawer";

/*
|--------------------------------------------------------------------------
| NAV (permission-aware)
|--------------------------------------------------------------------------
*/
const buildNav = (permissions) => [
  {
    title: "Overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "dashboard",
        path: "/merchant/dashboard",
      },
      {
        key: "business",
        label: "Business",
        icon: "business",
        children: [
          {
            key: "business-profile",
            label: "Business Profile",
            path: "/merchant/dashboard/business",
            permission: "business.read",
          },
          {
            key: "team-members",
            label: "Team Members",
            path: "/merchant/dashboard/team",
            permission: "team.read",
          },
          {
            key: "roles-permissions",
            label: "Roles & Permissions",
            path: "/merchant/dashboard/roles",
            permission: "roles.read",
          },
        ].filter(
          (item) =>
            !item.permission || hasPermission(permissions, item.permission)
        ),
      },
    ],
  },
];

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

  const navSections = useMemo(() => buildNav(permissions), [permissions]);

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

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Roles & permissions"
      navSections={navSections}
      profileName={
        user ? `${user.firstName} ${user.lastName}`.trim() : "Merchant Admin"
      }
      profileRole={myRoles[0]?.name}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ctex-text">
            Roles &amp; permissions
          </h1>
          <p className="mt-1 text-sm text-ctex-text-muted">
            Define roles and control what each team member can access.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light"
          >
            <PlusIcon className="h-4 w-4" />
            Create role
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Total roles" value={stats.total} loading={isLoading} />
        <MiniStat
          label="Custom roles"
          value={stats.custom}
          loading={isLoading}
          tone="blue"
        />
        <MiniStat
          label="System roles"
          value={stats.system}
          loading={isLoading}
          tone="neutral"
        />
        <MiniStat
          label="Total permissions granted"
          value={stats.totalPermissionsGranted}
          loading={isLoading}
          tone="success"
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roles list */}
      {isLoading && roles.length === 0 ? (
        <RoleSkeletons />
      ) : roles.length === 0 ? (
        <EmptyState onCreate={canManage ? handleCreate : undefined} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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
   SUB-COMPONENTS (unchanged from your file)
   -------------------------------------------------------------------------- */

function MiniStat({ label, value, loading, tone = "neutral" }) {
  const toneClass = {
    success: "text-emerald-500",
    warning: "text-amber-500",
    blue: "text-ctex-blue",
    neutral: "text-ctex-text",
  }[tone];

  return (
    <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-4 shadow-lg shadow-black/10">
      <p className="text-xs uppercase tracking-wide text-ctex-text-muted">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-ctex-elevated" />
      ) : (
        <p className={`mt-1.5 text-2xl font-semibold ${toneClass}`}>{value}</p>
      )}
    </div>
  );
}

function RoleCard({ role, canManage, onEdit, onDelete, onManagePermissions }) {
  const isSystem = role.isSystemRole;
  const permissionCount = role.permissions?.length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-ctex-text">
              {role.name}
            </h3>
            {isSystem && (
              <span className="flex-shrink-0 rounded-full bg-ctex-blue/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ctex-blue">
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

        {canManage && !isSystem && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-ctex-text-muted transition hover:bg-ctex-elevated hover:text-ctex-blue"
              aria-label="Edit role"
            >
              <EditIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-ctex-text-muted transition hover:bg-red-500/10 hover:text-red-500"
              aria-label="Delete role"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="rounded-full bg-ctex-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ctex-text-muted">
          {permissionCount} permission{permissionCount === 1 ? "" : "s"}
        </span>
      </div>

      {permissionCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {role.permissions.slice(0, 6).map((p) => (
            <span
              key={p.id}
              className="rounded-full border border-ctex-border bg-ctex-elevated/60 px-2 py-0.5 text-[10px] font-medium text-ctex-text-muted"
            >
              {p.key}
            </span>
          ))}
          {permissionCount > 6 && (
            <span className="rounded-full border border-ctex-border bg-ctex-elevated/60 px-2 py-0.5 text-[10px] font-medium text-ctex-text-muted">
              +{permissionCount - 6} more
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onManagePermissions}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 py-2 text-xs font-medium text-ctex-text transition hover:border-ctex-blue/40 hover:text-ctex-blue"
        >
          {canManage && !isSystem
            ? "Manage permissions"
            : "View permissions"}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="rounded-2xl border border-dashed border-ctex-border bg-ctex-surface/50 px-6 py-16 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ctex-elevated text-ctex-text-muted">
          <ShieldIcon className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium text-ctex-text">No roles yet</p>
        <p className="text-xs text-ctex-text-muted">
          Create roles to control what your team members can access.
        </p>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-ctex-blue hover:underline"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Create your first role
          </button>
        )}
      </div>
    </div>
  );
}

function RoleSkeletons() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-ctex-border bg-ctex-surface p-5"
        >
          <div className="mb-3 h-5 w-32 animate-pulse rounded bg-ctex-elevated" />
          <div className="mb-4 h-3 w-48 animate-pulse rounded bg-ctex-elevated" />
          <div className="flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-ctex-elevated" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-ctex-elevated" />
          </div>
          <div className="mt-4 h-9 w-full animate-pulse rounded-xl bg-ctex-elevated" />
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   ICONS
   -------------------------------------------------------------------------- */

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function EditIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}

function ShieldIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

function ArrowRightIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}