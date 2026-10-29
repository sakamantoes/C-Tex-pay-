import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  BadgeCheck,
  Building2,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import { useRoleStore } from "../../store/role.store";
import { hasPermission } from "../../utils/permissions";
import { buildMerchantNav } from "./merchantNav";

import AssignRoleModal from "../../components/team/AssignRoleModal";
import RemoveMemberModal from "../../components/team/RemoveMemberModal";
import InviteMemberModal from "../../components/team/InviteMemberModal";

/* --------------------------------------------------------------------------
   BRAND TONES
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
   HELPERS
   -------------------------------------------------------------------------- */
function statusTone(status) {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "PENDING":
    case "INACTIVE":
      return "amber";
    case "REMOVED":
    case "SUSPENDED":
      return "red";
    default:
      return "neutral";
  }
}

function toneClasses(tone) {
  switch (tone) {
    case "green":
      return "bg-emerald-500/10 text-emerald-500";
    case "amber":
      return "bg-amber-500/10 text-amber-500";
    case "red":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-ctex-border/40 text-ctex-text-muted";
  }
}

function dotClass(tone) {
  switch (tone) {
    case "green":
      return "bg-emerald-500";
    case "amber":
      return "bg-amber-500";
    case "red":
      return "bg-red-500";
    default:
      return "bg-ctex-text-muted";
  }
}

function formatDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/* --------------------------------------------------------------------------
   PAGE
   -------------------------------------------------------------------------- */
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

  const [assigning, setAssigning] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (permissions.length === 0) getMyMembership();
    getMembers();
    getRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navSections = useMemo(() => buildMerchantNav(permissions), [permissions]);

  const canManage = hasPermission(permissions, "team.manage");
  const canReadRoles = hasPermission(permissions, "roles.read");

  const stats = useMemo(() => {
    const active = members.filter((m) => m.status === "ACTIVE").length;
    const owners = members.filter((m) =>
      m.roles?.some((r) => r.name === "OWNER")
    ).length;
    const noRoles = members.filter(
      (m) => !m.roles || m.roles.length === 0
    ).length;
    return { total: members.length, active, owners, noRoles };
  }, [members]);

  const isSelf = (member) => member.user?.id === user?.id;
  const isOwner = (member) =>
    member.roles?.some((role) => role.name === "OWNER");

  const handleAssignRole = async (roleId) => {
    if (!assigning) return { success: false };
    const res = await assignRole(assigning.id, roleId);
    if (res.success) {
      setAssigning(null);
      await getMembers();
    }
    return res;
  };

  const handleRemoveRole = async (memberId, roleId) => {
    const res = await removeRole(memberId, roleId);
    if (res.success) await getMembers();
    return res;
  };

  const handleRemoveMember = async () => {
    if (!removing) return;
    const removingOwner = isOwner(removing);
    const res = await removeMember(removing.id);
    if (res.success) {
      setRemoving(null);
      await getMembers();
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
      await getMembers();
      toast.success("Invitation sent successfully.");
    }
    return res;
  };

  const profileName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Merchant Admin";

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Team members"
      navSections={navSections}
      profileName={profileName}
      profileRole={myRoles[0]?.name || "Member"}
    >
      {/* ─── HERO ──────────────────────────────────────────────── */}
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
              Team
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              Your team
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Manage who has access to your merchant account and what they can
              do.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
              <HeroPill icon={BadgeCheck}>
                {stats.total} member{stats.total === 1 ? "" : "s"}
              </HeroPill>
              <HeroPill icon={ShieldCheck}>
                {stats.owners} owner{stats.owners === 1 ? "" : "s"}
              </HeroPill>
              {stats.noRoles > 0 && (
                <HeroPill icon={Users} tone="warn">
                  {stats.noRoles} without roles
                </HeroPill>
              )}
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0B3E66] transition hover:-translate-y-px hover:bg-white/90 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Invite member
            </button>
          )}
        </div>
      </motion.section>

      {/* ─── STATS ──────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          loading={isLoading}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Active"
          value={stats.active}
          loading={isLoading}
          icon={BadgeCheck}
          tone="green"
        />
        <StatCard
          label="Owners"
          value={stats.owners}
          loading={isLoading}
          icon={ShieldCheck}
          tone="orange"
        />
        <StatCard
          label="No roles"
          value={stats.noRoles}
          loading={isLoading}
          icon={UserPlus}
          tone={stats.noRoles > 0 ? "oxblood" : "blue"}
        />
      </div>

      {/* ─── ERROR ──────────────────────────────────────────────── */}
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

      {/* ─── TABLE / CARDS ─────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mt-4 rounded-[28px] border border-ctex-border bg-ctex-surface"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={TONES.blue}
            >
              <Users className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ctex-text">
                Members
              </h3>
              <p className="mt-0.5 text-xs text-ctex-text-muted">
                {stats.total} member{stats.total === 1 ? "" : "s"} in this
                workspace
              </p>
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto px-2 pt-2 sm:px-3 md:block">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="text-xs text-ctex-text-muted">
              <tr>
                <Th>Member</Th>
                <Th>Contact</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && members.length === 0 && (
                <SkeletonRows rows={4} cols={6} />
              )}

              {!isLoading && members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <EmptyState
                      canManage={canManage}
                      onInvite={() => setInviteOpen(true)}
                    />
                  </td>
                </tr>
              )}

              <AnimatePresence initial={false}>
                {members.map((member) => {
                  const self = isSelf(member);
                  const memberRoles = member.roles || [];
                  const owner = isOwner(member);

                  return (
                    <motion.tr
                      key={member.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group"
                    >
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
                                <span className="rounded-full bg-ctex-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ctex-accent">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="truncate font-mono text-[11px] text-ctex-text-muted">
                              {member.id.slice(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ctex-text">
                            {member.user?.email || "—"}
                          </p>
                          {member.user?.phone && (
                            <p className="truncate text-[11px] text-ctex-text-muted">
                              {member.user.phone}
                            </p>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {memberRoles.length === 0 && (
                            <span className="text-[11px] italic text-ctex-text-muted">
                              No roles
                            </span>
                          )}
                          {memberRoles.map((role) => (
                            <RoleChip
                              key={role.id}
                              role={role}
                              canRemove={canManage && !self && !owner}
                              onRemove={() =>
                                handleRemoveRole(member.id, role.id)
                              }
                            />
                          ))}
                          {canManage && !self && !owner && (
                            <button
                              type="button"
                              onClick={() => setAssigning(member)}
                              className="rounded-full border border-dashed border-ctex-border px-2 py-0.5 text-[10px] font-medium text-ctex-text-muted transition hover:border-ctex-accent hover:text-ctex-accent"
                            >
                              + Add role
                            </button>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <StatusChip status={member.status} />
                      </Td>
                      <Td>
                        <span className="whitespace-nowrap text-[11px] text-ctex-text-muted">
                          {formatDate(member.joinedAt || member.createdAt)}
                        </span>
                      </Td>
                      <Td align="right">
                        {canManage && !self ? (
                          <button
                            type="button"
                            onClick={() => setRemoving(member)}
                            aria-label={
                              owner ? "Remove owner" : "Remove member"
                            }
                            title={owner ? "Remove owner" : "Remove member"}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ctex-text-muted transition hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Mobile cards */}
        <div className="px-3 pb-3 pt-2 md:hidden">
          {isLoading && members.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl bg-ctex-panel"
                />
              ))}
            </div>
          )}

          {!isLoading && members.length === 0 && (
            <div className="py-12">
              <EmptyState
                canManage={canManage}
                onInvite={() => setInviteOpen(true)}
              />
            </div>
          )}

          <div className="space-y-3">
            {members.map((member) => {
              const self = isSelf(member);
              const memberRoles = member.roles || [];
              const owner = isOwner(member);

              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-ctex-border bg-ctex-panel/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar
                        firstName={member.user?.firstName}
                        lastName={member.user?.lastName}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-ctex-text">
                            {member.user?.firstName}{" "}
                            {member.user?.lastName}
                          </p>
                          {self && (
                            <span className="rounded-full bg-ctex-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ctex-accent">
                              You
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-ctex-text-muted">
                          {member.user?.email || "—"}
                        </p>
                      </div>
                    </div>
                    <StatusChip status={member.status} />
                  </div>

                  {memberRoles.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {memberRoles.map((role) => (
                        <RoleChip
                          key={role.id}
                          role={role}
                          canRemove={canManage && !self && !owner}
                          onRemove={() =>
                            handleRemoveRole(member.id, role.id)
                          }
                        />
                      ))}
                    </div>
                  )}

                  {memberRoles.length === 0 && (
                    <p className="mt-3 text-[11px] italic text-ctex-text-muted">
                      No roles assigned
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ctex-border pt-3 text-[11px] text-ctex-text-muted">
                    {member.user?.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.user.phone}
                      </span>
                    )}
                    <span>
                      Joined {formatDate(member.joinedAt || member.createdAt)}
                    </span>
                  </div>

                  {canManage && !self && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {!owner && (
                        <button
                          type="button"
                          onClick={() => setAssigning(member)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Add role
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setRemoving(member)}
                        className={[
                          "inline-flex items-center justify-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-500/10",
                          owner ? "col-span-2" : "",
                        ].join(" ")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {owner ? "Remove owner" : "Remove"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Hint */}
      {canManage && members.length > 0 && (
        <p className="mt-4 text-xs text-ctex-text-muted">
          You cannot remove yourself. Removing an owner revokes their merchant
          membership and associated roles.
        </p>
      )}

      {/* Modals */}
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

      <RemoveMemberModal
        open={!!removing}
        member={removing}
        onCancel={() => {
          if (!isLoading) setRemoving(null);
        }}
        onConfirm={handleRemoveMember}
        isRemoving={isLoading}
      />

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

/* --------------------------------------------------------------------------
   SUB-COMPONENTS
   -------------------------------------------------------------------------- */

function HeroPill({ icon: Icon, children, tone }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur",
        tone === "warn"
          ? "border-amber-300/40 bg-amber-300/15 text-white"
          : "border-white/25 bg-white/15 text-white",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-3.5 w-3.5",
          tone === "warn" ? "text-amber-200" : "text-white/80",
        ].join(" ")}
      />
      {children}
    </span>
  );
}

function StatCard({ label, value, loading, icon: Icon, tone }) {
  return (
    <div className="rounded-[24px] border border-ctex-border bg-ctex-surface p-4">
      <div className="flex items-start justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={TONES[tone] || TONES.blue}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-ctex-text-muted">
        {label}
      </p>
      {loading ? (
        <div className="mt-1 h-7 w-10 animate-pulse rounded bg-ctex-panel" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ctex-text">
          {value}
        </p>
      )}
    </div>
  );
}

function EmptyState({ canManage, onInvite }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={TONES.blue}
      >
        <Users className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <p className="text-sm font-semibold text-ctex-text">
        No team members yet
      </p>
      <p className="text-xs text-ctex-text-muted">
        Invite members to collaborate on your merchant account.
      </p>
      {canManage && (
        <button
          type="button"
          onClick={onInvite}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-ctex-accent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          Invite a member
        </button>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClasses(tone),
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass(tone)}`} />
      {status}
    </span>
  );
}

function RoleChip({ role, canRemove, onRemove }) {
  const isSystem = role.isSystemRole;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isSystem
          ? "bg-ctex-accent/10 text-ctex-accent"
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
          <X className="h-2.5 w-2.5" strokeWidth={3} />
        </button>
      )}
    </span>
  );
}

function Avatar({ firstName = "", lastName = "" }) {
  const initials =
    (firstName?.charAt(0) || "") + (lastName?.charAt(0) || "");
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
    safe.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;

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

function Th({ children, align = "left" }) {
  return (
    <th
      className={[
        "whitespace-nowrap bg-ctex-panel px-4 py-3 font-medium first:rounded-l-xl last:rounded-r-xl",
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
        "border-b border-ctex-border px-4 py-3.5 align-top transition group-hover:bg-ctex-panel/60",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

function SkeletonRows({ rows, cols }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-4">
              <div className="h-4 w-full animate-pulse rounded bg-ctex-panel" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}