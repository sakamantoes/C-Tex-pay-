import {
  MerchantMember,
  Role,
  MerchantMemberRole,
  User,
  MerchantInvitation,
  Notification,
} from "../models/index.js";
import sequelize from "../config/database.js";
import crypto from "crypto";
import env from "../config/constant.js";
import { sendMail } from "../service/mail.service.js";
import { createNotification } from "../service/notification.service.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Count ACTIVE owners of a merchant.
 *
 * An owner is:
 * - MerchantMember.status = ACTIVE
 * - Role.name = OWNER
 * - Role.isSystemRole = true
 *
 * @param {string} merchantId
 * @param {Object} [options]
 * @param {import("sequelize").Transaction} [options.transaction]
 * @returns {Promise<number>}
 */
const countActiveOwners = async (merchantId, { transaction } = {}) => {
  return MerchantMember.count({
    where: {
      merchantId,
      status: "ACTIVE",
    },
    include: [
      {
        model: Role,
        as: "roles",
        required: true,
        through: {
          attributes: [],
        },
        where: {
          merchantId,
          name: "OWNER",
          isSystemRole: true,
        },
      },
    ],
    distinct: true,
    transaction,
  });
};

/**
 * Include definition used whenever a member is returned.
 */
const memberInclude = [
  {
    model: User,
    as: "user",
    attributes: [
      "id",
      "firstName",
      "lastName",
      "email",
      "phone",
    ],
  },
  {
    model: Role,
    as: "roles",
    through: {
      attributes: [],
    },
    attributes: [
      "id",
      "name",
      "description",
      "isSystemRole",
    ],
  },
];

/*
|--------------------------------------------------------------------------
| INVITE MEMBER
|--------------------------------------------------------------------------
| POST /merchant-members/invite
| Required permission: team.manage
*/

export const inviteMember = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { email, roleId } = req.body;

    if (!email?.trim() || !roleId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Email and role ID are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const merchantId = req.merchant.id;

    /*
    |--------------------------------------------------------------------------
    | Verify role belongs to this merchant
    |--------------------------------------------------------------------------
    */

    const role = await Role.findOne({
      where: {
        id: roleId,
        merchantId,
      },
      transaction,
    });

    if (!role) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check existing user/member
    |--------------------------------------------------------------------------
    */

    const invitedUser = await User.findOne({
      where: {
        email: normalizedEmail,
      },
      transaction,
    });

    if (invitedUser) {
      const existingMember = await MerchantMember.findOne({
        where: {
          merchantId,
          userId: invitedUser.id,
        },
        transaction,
      });

      /*
      | Existing ACTIVE/PENDING member cannot be invited again.
      | REMOVED members are allowed to be invited again.
      */
      if (existingMember && existingMember.status !== "REMOVED") {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message: "User is already a member of this merchant",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate pending invitations
    |--------------------------------------------------------------------------
    */

    const existingInvitation = await MerchantInvitation.findOne({
      where: {
        merchantId,
        email: normalizedEmail,
        acceptedAt: null,
      },
      transaction,
    });

    if (existingInvitation) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message: "A pending invitation already exists for this email",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create invitation
    |--------------------------------------------------------------------------
    */

    const rawToken = crypto.randomBytes(32).toString("hex");

    const invitation = await MerchantInvitation.create(
      {
        merchantId,
        roleId,
        email: normalizedEmail,
        token: hashToken(rawToken),
        expiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ),
      },
      {
        transaction,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Create notification for existing user
    |--------------------------------------------------------------------------
    */

    if (invitedUser) {
      await createNotification(
        {
          userId: invitedUser.id,
          type: "MERCHANT_INVITATION",
          title: "Merchant invitation",
          message: `You have been invited to join ${
            req.merchant.businessProfile?.businessName ||
            "a business"
          } as ${role.name}.`,
          data: {
            invitationId: invitation.id,
            merchantId,
            roleId,
          },
        },
        {
          transaction,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Invitation URL
    |--------------------------------------------------------------------------
    */

    const baseUrl = env.FRONTEND_URL.replace(/\/$/, "");

    const invitationUrl =
      `${baseUrl}/accept-invitation?token=${rawToken}`;

    /*
    |--------------------------------------------------------------------------
    | Send invitation email
    |--------------------------------------------------------------------------
    */

    await sendMail({
      to: normalizedEmail,
      subject: `Invitation to join ${
        req.merchant.businessProfile?.businessName ||
        "a C-TEX PAY business"
      }`,
      message: `
        <div style="font-family: Arial, sans-serif;">
          <h2>You have been invited to join a business on C-TEX PAY</h2>

          <p>
            You have been invited to join as
            <strong>${role.name}</strong>.
          </p>

          <p>
            <a href="${invitationUrl}">
              Accept invitation
            </a>
          </p>

          <p>
            This invitation expires in 7 days.
          </p>
        </div>
      `,
    });

    /*
    |--------------------------------------------------------------------------
    | Commit
    |--------------------------------------------------------------------------
    */

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: {
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Invite member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to invite member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ACCEPT MEMBER INVITATION
|--------------------------------------------------------------------------
| POST /merchant-members/invitations/accept
| POST /merchant-members/invitations/:id/accept
|
| Requires:
| protect
*/

export const acceptMemberInvitation = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { token } = req.body || {};

    if (!req.params.id && !token) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invitation token or ID is required",
      });
    }

    const where = req.params.id
      ? {
          id: req.params.id,
        }
      : {
          token: hashToken(token),
        };

    const invitation = await MerchantInvitation.findOne({
      where,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    /*
    |--------------------------------------------------------------------------
    | Validate invitation
    |--------------------------------------------------------------------------
    */

    if (
      !invitation ||
      invitation.acceptedAt ||
      new Date(invitation.expiresAt) <= new Date()
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invitation is invalid or expired",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Ensure invitation belongs to logged-in user
    |--------------------------------------------------------------------------
    */

    if (
      req.user.email.toLowerCase() !==
      invitation.email
    ) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,
        message:
          "This invitation was sent to a different email address",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find existing membership
    |--------------------------------------------------------------------------
    */

    let member = await MerchantMember.findOne({
      where: {
        merchantId: invitation.merchantId,
        userId: req.user.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate active membership
    |--------------------------------------------------------------------------
    */

    if (member && member.status !== "REMOVED") {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "You are already a member of this merchant",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Reactivate removed membership OR create new membership
    |--------------------------------------------------------------------------
    */

    if (member) {
      await member.update(
        {
          status: "ACTIVE",
          joinedAt: new Date(),
        },
        {
          transaction,
        }
      );
    } else {
      member = await MerchantMember.create(
        {
          merchantId: invitation.merchantId,
          userId: req.user.id,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
        {
          transaction,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Assign invitation role
    |--------------------------------------------------------------------------
    */

    await MerchantMemberRole.findOrCreate({
      where: {
        merchantMemberId: member.id,
        roleId: invitation.roleId,
      },
      defaults: {
        merchantMemberId: member.id,
        roleId: invitation.roleId,
      },
      transaction,
    });

    /*
    |--------------------------------------------------------------------------
    | Mark invitation accepted
    |--------------------------------------------------------------------------
    */

    await invitation.update(
      {
        acceptedAt: new Date(),
      },
      {
        transaction,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Mark matching invitation notification as read
    |--------------------------------------------------------------------------
    */

    const invitationNotifications =
      await Notification.findAll({
        where: {
          userId: req.user.id,
          type: "MERCHANT_INVITATION",
        },
        transaction,
      });

    for (const notification of invitationNotifications) {
      if (
        notification.data?.invitationId ===
        invitation.id
      ) {
        await notification.update(
          {
            readAt: new Date(),
          },
          {
            transaction,
          }
        );
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: {
        memberId: member.id,
        merchantId: invitation.merchantId,
        roleId: invitation.roleId,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "Accept member invitation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to accept invitation",
    });
  }
};

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
| GET   /merchant-members/notifications
| PATCH /merchant-members/notifications/:id/read
|
| Requires:
| protect
*/

export const getMyNotifications = async (req, res) => {
  try {
    const notifications =
      await Notification.findAll({
        where: {
          userId: req.user.id,
        },
        order: [["createdAt", "DESC"]],
        limit: 50,
      });

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.filter(
          (notification) => !notification.readAt
        ).length,
      },
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get notifications",
    });
  }
};

export const markNotificationRead = async (
  req,
  res
) => {
  try {
    const notification =
      await Notification.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.update({
      readAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        notification,
      },
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET MEMBERS
|--------------------------------------------------------------------------
| GET /merchant-members
|
| IMPORTANT:
| REMOVED memberships are intentionally excluded.
| This prevents removed members from appearing again after
| the frontend refreshes the member list.
*/

export const getMembers = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const members = await MerchantMember.findAll({
      where: {
        merchantId,
        status: "ACTIVE",
      },
      include: memberInclude,
      order: [["joinedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: {
        members,
        count: members.length,
      },
    });
  } catch (error) {
    console.error("Get members error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get members",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE MEMBER
|--------------------------------------------------------------------------
| GET /merchant-members/:id
|
| REMOVED members are treated as no longer active members.
*/

export const getMember = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;

    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
        status: "ACTIVE",
      },
      include: memberInclude,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        member,
      },
    });
  } catch (error) {
    console.error("Get member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ASSIGN ROLE TO MEMBER
|--------------------------------------------------------------------------
| POST /merchant-members/:id/roles
| POST /merchant-members/:id/roles/:roleId
|
| Required permission:
| team.manage
*/

export const assignRoleToMember = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;
    const roleId =
      req.params.roleId || req.body.roleId;

    if (!roleId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Role ID is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find active member
    |--------------------------------------------------------------------------
    */

    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
        status: "ACTIVE",
      },
      transaction,
    });

    if (!member) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Active member not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify role belongs to merchant
    |--------------------------------------------------------------------------
    */

    const role = await Role.findOne({
      where: {
        id: roleId,
        merchantId,
      },
      transaction,
    });

    if (!role) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate role assignment
    |--------------------------------------------------------------------------
    */

    const existingAssignment =
      await MerchantMemberRole.findOne({
        where: {
          merchantMemberId: memberId,
          roleId,
        },
        transaction,
      });

    if (existingAssignment) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "Role is already assigned to this member",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Assign role
    |--------------------------------------------------------------------------
    */

    await MerchantMemberRole.create(
      {
        merchantMemberId: memberId,
        roleId,
      },
      {
        transaction,
      }
    );

    await transaction.commit();

    /*
    |--------------------------------------------------------------------------
    | Reload member with relationships
    |--------------------------------------------------------------------------
    */

    const updatedMember =
      await MerchantMember.findByPk(
        memberId,
        {
          include: memberInclude,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Role assigned to member successfully",
      data: {
        member: updatedMember,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "Assign role to member error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to assign role to member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE ROLE FROM MEMBER
|--------------------------------------------------------------------------
| DELETE /merchant-members/:id/roles/:roleId
|
| Required permission:
| team.manage
|
| The OWNER role cannot be removed if it would
| leave the merchant without an owner.
*/

export const removeRoleFromMember = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;
    const roleId = req.params.roleId;

    /*
    |--------------------------------------------------------------------------
    | Find active member
    |--------------------------------------------------------------------------
    */

    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
        status: "ACTIVE",
      },
      transaction,
    });

    if (!member) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Active member not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify role
    |--------------------------------------------------------------------------
    */

    const role = await Role.findOne({
      where: {
        id: roleId,
        merchantId,
      },
      transaction,
    });

    if (!role) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent removal of the final OWNER
    |--------------------------------------------------------------------------
    */

    if (
      role.isSystemRole &&
      role.name === "OWNER"
    ) {
      const ownerCount =
        await countActiveOwners(
          merchantId,
          {
            transaction,
          }
        );

      if (ownerCount <= 1) {
        await transaction.rollback();

        return res.status(403).json({
          success: false,
          message:
            "Cannot remove the only OWNER role from the last owner",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Find role assignment
    |--------------------------------------------------------------------------
    */

    const assignment =
      await MerchantMemberRole.findOne({
        where: {
          merchantMemberId: memberId,
          roleId,
        },
        transaction,
      });

    if (!assignment) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Role is not assigned to this member",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Remove role
    |--------------------------------------------------------------------------
    */

    await assignment.destroy({
      transaction,
    });

    await transaction.commit();

    /*
    |--------------------------------------------------------------------------
    | Return updated member
    |--------------------------------------------------------------------------
    */

    const updatedMember =
      await MerchantMember.findByPk(
        memberId,
        {
          include: memberInclude,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Role removed from member successfully",
      data: {
        member: updatedMember,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "Remove role from member error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove role from member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE MEMBER
|--------------------------------------------------------------------------
| DELETE /merchant-members/:id
|
| Required permission:
| team.manage
|
| Behavior:
| 1. Find ACTIVE membership.
| 2. Check whether member is an OWNER.
| 3. Prevent removing the final OWNER.
| 4. Delete ALL role assignments.
| 5. Mark membership as REMOVED.
| 6. Commit everything atomically.
|
| This means:
|
| OWNER:
| membership -> REMOVED
| all roles   -> deleted
|
| NORMAL MEMBER:
| membership -> REMOVED
| all roles   -> deleted
|
*/

export const removeMember = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;

    /*
    |--------------------------------------------------------------------------
    | Find ACTIVE member and lock the row
    |--------------------------------------------------------------------------
    */

    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
        status: "ACTIVE",
      },
      include: [
        {
          model: Role,
          as: "roles",
          through: {
            attributes: [],
          },
          attributes: [
            "id",
            "name",
            "isSystemRole",
          ],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!member) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Active member not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine whether this member is an OWNER
    |--------------------------------------------------------------------------
    */

    const isOwner = member.roles.some(
      (role) =>
        role.name === "OWNER" &&
        role.isSystemRole === true
    );

    /*
    |--------------------------------------------------------------------------
    | Prevent removal of the final OWNER
    |--------------------------------------------------------------------------
    */

    if (isOwner) {
      const ownerCount =
        await countActiveOwners(
          merchantId,
          {
            transaction,
          }
        );

      if (ownerCount <= 1) {
        await transaction.rollback();

        return res.status(403).json({
          success: false,
          message:
            "Cannot remove the only owner of the merchant",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Remove ALL role assignments
    |--------------------------------------------------------------------------
    |
    | This is important.
    |
    | If the member is an OWNER with other roles such as:
    |
    | OWNER
    | ADMIN
    | TRANSACTIONS_MANAGER
    |
    | all of them are removed together with the
    | merchant membership.
    |
    */

    await MerchantMemberRole.destroy({
      where: {
        merchantMemberId: memberId,
      },
      transaction,
    });

    /*
    |--------------------------------------------------------------------------
    | Soft-remove membership
    |--------------------------------------------------------------------------
    */

    await member.update(
      {
        status: "REMOVED",
      },
      {
        transaction,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Commit membership + role removal together
    |--------------------------------------------------------------------------
    */

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: isOwner
        ? "Owner removed successfully"
        : "Member removed successfully",
      data: {
        memberId,
        status: "REMOVED",
        rolesRemoved: true,
      },
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Roll back EVERYTHING if anything fails.
    |--------------------------------------------------------------------------
    */

    await transaction.rollback();

    console.error(
      "Remove member error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove member",
    });
  }
};
