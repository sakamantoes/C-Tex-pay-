import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import { useRoleStore } from "../../store/role.store";
import { hasPermission } from "../../utils/permissions";

import AssignRoleModal from "../../components/team/AssignRoleModal";
import RemoveMemberModal from "../../components/team/RemoveMemberModal";
import InviteMemberModal from "../../components/team/InviteMemberModal";

/*
|--------------------------------------------------------------------------
| NAV
|--------------------------------------------------------------------------
*/

const buildNav = () => [
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
        ],
      },
    ],
  },
];

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function TeamMembersPage() {
  const { user } = useAuthStore();

  const {
    roles: myRoles,
    permissions,
    businessProfile,
    getMyMembership,
  } = useMerchantStore();

  const {
    members,
    isLoading,
    error,
    getMembers,
    inviteMember,
    assignRole,
    removeRole,
    removeMember,
    clearError,
  } = useMerchantMemberStore();

  const {
    roles: merchantRoles,
    isLoading: rolesLoading,
    getRoles,
  } = useRoleStore();

  /*
  |--------------------------------------------------------------------------
  | Modals
  |--------------------------------------------------------------------------
  */

  const [assigning, setAssigning] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Bootstrap
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (permissions.length === 0) {
      getMyMembership();
    }

    getMembers();
    getRoles();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navSections = useMemo(() => buildNav(), []);

  /*
  |--------------------------------------------------------------------------
  | Permissions
  |--------------------------------------------------------------------------
  */

  const canManage = hasPermission(permissions, "team.manage");
  const canReadRoles = hasPermission(permissions, "roles.read");

  /*
  |--------------------------------------------------------------------------
  | Stats
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const active = members.filter(
      (member) => member.status === "ACTIVE"
    ).length;

    const owners = members.filter((member) =>
      member.roles?.some((role) => role.name === "OWNER")
    ).length;

    const noRoles = members.filter(
      (member) => !member.roles || member.roles.length === 0
    ).length;

    return {
      total: members.length,
      active,
      owners,
      noRoles,
    };
  }, [members]);

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const isSelf = (member) => member.user?.id === user?.id;

  const isOwner = (member) =>
    member.roles?.some((role) => role.name === "OWNER");

  /*
  |--------------------------------------------------------------------------
  | Handlers
  |--------------------------------------------------------------------------
  */

  const handleAssignRole = async (roleId) => {
    if (!assigning) {
      return {
        success: false,
      };
    }

    const res = await assignRole(assigning.id, roleId);

    if (res.success) {
      setAssigning(null);

      // Refresh membership list so the UI reflects the new role.
      await getMembers();
    }

    return res;
  };

  const handleRemoveRole = async (memberId, roleId) => {
    const res = await removeRole(memberId, roleId);

    if (res.success) {
      // Refresh membership list so role changes are reflected immediately.
      await getMembers();
    }

    return res;
  };

  const handleRemoveMember = async () => {
    if (!removing) {
      return;
    }

    const removingOwner = isOwner(removing);

    const res = await removeMember(removing.id);

    if (res.success) {
      /*
      |--------------------------------------------------------------------------
      | Close modal immediately after successful removal
      |--------------------------------------------------------------------------
      */

      setRemoving(null);

      /*
      |--------------------------------------------------------------------------
      | Refresh members
      |--------------------------------------------------------------------------
      |
      | This makes sure the removed membership disappears from the table
      | and the statistics are recalculated from the server response.
      |
      */

      await getMembers();

      /*
      |--------------------------------------------------------------------------
      | Notification
      |--------------------------------------------------------------------------
      */

      toast.success(
        removingOwner
          ? "Owner removed successfully."
          : "Member removed successfully."
      );
    }
  };

  const handleInvite = async (payload) => {
    const res = await inviteMember(payload);

    if (res.success) {
      setInviteOpen(false);

      // Refresh members after invitation.
      await getMembers();

      toast.success("Invitation sent successfully.");
    }

    return res;
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Team members"
      navSections={navSections}
      profileName={
        user
          ? `${user.firstName} ${user.lastName}`.trim()
          : "Merchant Admin"
      }
      profileRole={myRoles[0]?.name}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ctex-text">
            Team members
          </h1>

          <p className="mt-1 text-sm text-ctex-text-muted">
            Manage who has access to your merchant account and what they can
            do.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light"
          >
            <PlusIcon className="h-4 w-4" />
            Invite member
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Total members"
          value={stats.total}
          loading={isLoading}
        />

        <MiniStat
          label="Active"
          value={stats.active}
          loading={isLoading}
          tone="success"
        />

        <MiniStat
          label="Owners"
          value={stats.owners}
          loading={isLoading}
          tone="blue"
        />

        <MiniStat
          label="Without roles"
          value={stats.noRoles}
          loading={isLoading}
          tone={stats.noRoles > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -6,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -6,
            }}
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members table */}
      <div className="overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ctex-border">
            <thead className="bg-ctex-elevated/60">
              <tr>
                <Th>Member</Th>
                <Th>Contact</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ctex-border">
              {/* Loading */}
              {isLoading && members.length === 0 && (
                <SkeletonRows rows={4} cols={6} />
              )}

              {/* Empty */}
              {!isLoading && members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ctex-elevated text-ctex-text-muted">
                        <UsersIcon className="h-6 w-6" />
                      </div>

                      <p className="text-sm font-medium text-ctex-text">
                        No team members yet
                      </p>

                      <p className="text-xs text-ctex-text-muted">
                        Invite members to collaborate on your merchant
                        account.
                      </p>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setInviteOpen(true)}
                          className="mt-1 text-xs font-medium text-ctex-blue hover:underline"
                        >
                          Invite a member →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Members */}
              <AnimatePresence initial={false}>
                {members.map((member) => {
                  const self = isSelf(member);
                  const memberRoles = member.roles || [];
                  const owner = isOwner(member);

                  return (
                    <motion.tr
                      key={member.id}
                      layout
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      exit={{
                        opacity: 0,
                      }}
                      className="transition-colors hover:bg-ctex-elevated/40"
                    >
                      {/* Member */}
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar
                            firstName={member.user?.firstName}
                            lastName={member.user?.lastName}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-ctex-text">
                                {member.user?.firstName}{" "}
                                {member.user?.lastName}
                              </p>

                              {self && (
                                <span className="rounded-full bg-ctex-blue/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ctex-blue">
                                  You
                                </span>
                              )}
                            </div>

                            <p className="truncate text-xs text-ctex-text-muted">
                              {member.id.slice(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </Td>

                      {/* Contact */}
                      <Td>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ctex-text">
                            {member.user?.email || "—"}
                          </p>

                          {member.user?.phone && (
                            <p className="truncate text-xs text-ctex-text-muted">
                              {member.user.phone}
                            </p>
                          )}
                        </div>
                      </Td>

                      {/* Roles */}
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {memberRoles.length === 0 && (
                            <span className="text-xs italic text-ctex-text-muted">
                              No roles
                            </span>
                          )}

                          {memberRoles.map((role) => (
                            <RoleChip
                              key={role.id}
                              role={role}
                              canRemove={
                                canManage &&
                                !self &&
                                !owner
                              }
                              onRemove={() =>
                                handleRemoveRole(member.id, role.id)
                              }
                            />
                          ))}

                          {/* Add role */}
                          {canManage && !self && !owner && (
                            <button
                              type="button"
                              onClick={() => setAssigning(member)}
                              className="rounded-full border border-dashed border-ctex-border px-2 py-0.5 text-[10px] font-medium text-ctex-text-muted transition hover:border-ctex-blue hover:text-ctex-blue"
                            >
                              + Add role
                            </button>
                          )}
                        </div>
                      </Td>

                      {/* Status */}
                      <Td>
                        <StatusBadge status={member.status} />
                      </Td>

                      {/* Joined */}
                      <Td>
                        <span className="text-xs text-ctex-text-muted">
                          {formatDate(
                            member.joinedAt || member.createdAt
                          )}
                        </span>
                      </Td>

                      {/* Actions */}
                      <Td align="right">
                        {canManage && !self ? (
                          <button
                            type="button"
                            onClick={() => setRemoving(member)}
                            className="rounded-lg p-2 text-ctex-text-muted transition hover:bg-red-500/10 hover:text-red-500"
                            aria-label={
                              owner
                                ? "Remove owner"
                                : "Remove member"
                            }
                            title={
                              owner
                                ? "Remove owner"
                                : "Remove member"
                            }
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-ctex-text-muted">
                            —
                          </span>
                        )}
                      </Td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hint */}
      {canManage && (
        <p className="mt-4 text-xs text-ctex-text-muted">
          Tip: you cannot remove yourself. Removing an owner removes their
          merchant membership and associated roles.
        </p>
      )}

      {/* Assign Role Modal */}
      <AssignRoleModal
        open={!!assigning}
        member={assigning}
        roles={merchantRoles}
        rolesLoading={rolesLoading}
        canReadRoles={canReadRoles}
        onClose={() => {
          setAssigning(null);
          clearError();
        }}
        onAssign={handleAssignRole}
        isSaving={isLoading}
      />

      {/* Remove Member / Owner Modal */}
      <RemoveMemberModal
        open={!!removing}
        member={removing}
        onCancel={() => {
          if (!isLoading) {
            setRemoving(null);
          }
        }}
        onConfirm={handleRemoveMember}
        isRemoving={isLoading}
      />

      {/* Invite Modal */}
      <InviteMemberModal
        open={inviteOpen}
        roles={merchantRoles}
        rolesLoading={rolesLoading}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
        isInviting={isLoading}
      />
    </DashboardLayout>
  );
}

/*
|--------------------------------------------------------------------------
| TABLE COMPONENTS
|--------------------------------------------------------------------------
*/

function Th({ children, align = "left" }) {
  return (
    <th
      className={[
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ctex-text-muted",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td
      className={[
        "px-4 py-3 align-top",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

/*
|--------------------------------------------------------------------------
| STAT
|--------------------------------------------------------------------------
*/

function MiniStat({
  label,
  value,
  loading,
  tone = "neutral",
}) {
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
        <p
          className={`mt-1.5 text-2xl font-semibold ${toneClass}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ROLE CHIP
|--------------------------------------------------------------------------
*/

function RoleChip({
  role,
  canRemove,
  onRemove,
}) {
  const isSystem = role.isSystemRole;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isSystem
          ? "bg-ctex-blue/10 text-ctex-blue"
          : "bg-ctex-border/40 text-ctex-text-muted",
      ].join(" ")}
    >
      {role.name}

      {canRemove && !isSystem && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 transition hover:bg-black/10"
          aria-label={`Remove ${role.name}`}
        >
          <svg
            className="h-2.5 w-2.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

function StatusBadge({ status }) {
  const tone = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500",
    PENDING: "bg-amber-500/10 text-amber-500",
    INACTIVE: "bg-amber-500/10 text-amber-500",
    REMOVED: "bg-red-500/10 text-red-500",
    SUSPENDED: "bg-red-500/10 text-red-500",
  }[status] || "bg-ctex-border/40 text-ctex-text-muted";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| AVATAR
|--------------------------------------------------------------------------
*/

function Avatar({
  firstName = "",
  lastName = "",
}) {
  const initials =
    (firstName?.charAt(0) || "") +
    (lastName?.charAt(0) || "");

  const safe = initials.toUpperCase() || "?";

  const colors = [
    "bg-blue-500/15 text-blue-500",
    "bg-emerald-500/15 text-emerald-500",
    "bg-purple-500/15 text-purple-500",
    "bg-amber-500/15 text-amber-500",
    "bg-pink-500/15 text-pink-500",
    "bg-cyan-500/15 text-cyan-500",
  ];

  const idx =
    safe
      .split("")
      .reduce(
        (acc, c) => acc + c.charCodeAt(0),
        0
      ) % colors.length;

  return (
    <span
      className={[
        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        colors[idx],
      ].join(" ")}
    >
      {safe}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| SKELETON
|--------------------------------------------------------------------------
*/

function SkeletonRows({
  rows,
  cols,
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td
              key={c}
              className="px-4 py-4"
            >
              <div className="h-4 w-full animate-pulse rounded bg-ctex-elevated" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| DATE
|--------------------------------------------------------------------------
*/

function formatDate(date) {
  if (!date) {
    return "—";
  }

  try {
    return new Date(date).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  } catch {
    return "—";
  }
}

/*
|--------------------------------------------------------------------------
| ICONS
|--------------------------------------------------------------------------
*/

function PlusIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}