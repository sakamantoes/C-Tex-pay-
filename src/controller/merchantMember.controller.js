import {
  MerchantMember,
  Role,
  MerchantMemberRole,
  User,
  MerchantInvitation,
  Notification,
} from "../models/index.js";
import sequelize from "../config/database.js";
import { Op } from "sequelize";
import crypto from "crypto";
import env from "../config/constant.js";
import { sendMail } from "../service/mail.service.js";
import { createNotification } from "../service/notification.service.js";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const inviteMember = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { email, roleId } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const merchantId = req.merchant.id;

    const role = await Role.findOne({
      where: { id: roleId, merchantId },
      transaction,
    });

    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const invitedUser = await User.findOne({
      where: { email: normalizedEmail },
      transaction,
    });

    if (invitedUser) {
      const existingMember = await MerchantMember.findOne({
        where: { merchantId, userId: invitedUser.id },
        transaction,
      });

      if (existingMember && existingMember.status !== "REMOVED") {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: "User is already a member of this merchant",
        });
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const invitation = await MerchantInvitation.create(
      {
        merchantId,
        roleId,
        email: normalizedEmail,
        token: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { transaction },
    );

    if (invitedUser) {
      await createNotification(
        {
          userId: invitedUser.id,
          type: "MERCHANT_INVITATION",
          title: "Merchant invitation",
          message: `You have been invited to join ${req.merchant.businessProfile?.businessName || "a business"} as ${role.name}.`,
          data: { invitationId: invitation.id, merchantId, roleId },
        },
        { transaction },
      );
    }

    const invitationUrl = `${env.FRONTEND_URL}accept-invitation?token=${rawToken}`;
    await sendMail({
      to: normalizedEmail,
      subject: `Invitation to join ${req.merchant.businessProfile?.businessName || "a C-TEX PAY business"}`,
      message: `
        <div style="font-family: Arial, sans-serif;">
          <h2>You have been invited to join a business on C-TEX PAY</h2>
          <p>You have been invited to join as <strong>${role.name}</strong>.</p>
          <p><a href="${invitationUrl}">Accept invitation</a></p>
          <p>This invitation expires in 7 days.</p>
        </div>
      `,
    });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: { invitationId: invitation.id, expiresAt: invitation.expiresAt },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Invite member error:", error);
    return res.status(500).json({ success: false, message: "Failed to invite member" });
  }
};

export const acceptMemberInvitation = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { token } = req.body;
    const invitation = await MerchantInvitation.findOne({
      where: req.params.id
        ? { id: req.params.id }
        : { token: hashToken(token) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!invitation || invitation.acceptedAt || new Date(invitation.expiresAt) <= new Date()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Invitation is invalid or expired" });
    }

    if (req.user.email.toLowerCase() !== invitation.email) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "This invitation was sent to a different email address",
      });
    }

    let member = await MerchantMember.findOne({
      where: { merchantId: invitation.merchantId, userId: req.user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (member && member.status !== "REMOVED") {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "You are already a member of this merchant" });
    }

    if (member) {
      await member.update({ status: "ACTIVE", joinedAt: new Date() }, { transaction });
    } else {
      member = await MerchantMember.create(
        {
          merchantId: invitation.merchantId,
          userId: req.user.id,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
        { transaction },
      );
    }

    await MerchantMemberRole.findOrCreate({
      where: { merchantMemberId: member.id, roleId: invitation.roleId },
      defaults: { merchantMemberId: member.id, roleId: invitation.roleId },
      transaction,
    });

    await invitation.update({ acceptedAt: new Date() }, { transaction });
    const invitationNotifications = await Notification.findAll({
      where: { userId: req.user.id, type: "MERCHANT_INVITATION" },
      transaction,
    });

    for (const notification of invitationNotifications) {
      if (notification.data?.invitationId === invitation.id) {
        await notification.update({ readAt: new Date() }, { transaction });
      }
    }
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: { memberId: member.id, merchantId: invitation.merchantId, roleId: invitation.roleId },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Accept member invitation error:", error);
    return res.status(500).json({ success: false, message: "Failed to accept invitation" });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.filter((notification) => !notification.readAt).length,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ success: false, message: "Failed to get notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    await notification.update({ readAt: new Date() });
    return res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ success: false, message: "Failed to update notification" });
  }
};

export const getMembers = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const members = await MerchantMember.findAll({
      where: { merchantId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
          attributes: ["id", "name", "description", "isSystemRole"],
        },
      ],
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

export const getMember = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;

    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
          attributes: ["id", "name", "description", "isSystemRole"],
        },
      ],
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

export const assignRoleToMember = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;
    const roleId = req.params.roleId || req.body.roleId;

    // Verify member belongs to merchant
    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
      },
      transaction,
    });

    if (!member) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Verify role belongs to merchant
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

    // Check if already assigned
    const existingAssignment = await MerchantMemberRole.findOne({
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
        message: "Role is already assigned to this member",
      });
    }

    await MerchantMemberRole.create(
      {
        merchantMemberId: memberId,
        roleId,
      },
      { transaction }
    );

    await transaction.commit();

    const updatedMember = await MerchantMember.findByPk(memberId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
          attributes: ["id", "name", "description", "isSystemRole"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Role assigned to member successfully",
      data: {
        member: updatedMember,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Assign role to member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign role to member",
    });
  }
};

export const removeRoleFromMember = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;
    const roleId = req.params.roleId;

    // Verify member belongs to merchant
    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
      },
      transaction,
    });

    if (!member) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Check if this is the owner and the role is OWNER
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

    // Prevent removing OWNER role from the last owner
    if (role.isSystemRole && role.name === "OWNER") {
      const ownerMembers = await MerchantMemberRole.findAll({
        where: {
          merchantId,
        },
        include: [
          {
            model: MerchantMember,
            as: "merchantMember",
            where: { merchantId },
          },
          {
            model: Role,
            as: "role",
            where: {
              merchantId,
              name: "OWNER",
            },
          },
        ],
        transaction,
      });

      if (ownerMembers.length <= 1) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: "Cannot remove the only OWNER role from the last owner",
        });
      }
    }

    const assignment = await MerchantMemberRole.findOne({
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
        message: "Role is not assigned to this member",
      });
    }

    await assignment.destroy({ transaction });

    await transaction.commit();

    const updatedMember = await MerchantMember.findByPk(memberId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
          attributes: ["id", "name", "description", "isSystemRole"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Role removed from member successfully",
      data: {
        member: updatedMember,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Remove role from member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove role from member",
    });
  }
};

export const removeMember = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;

    // Verify member belongs to merchant
    const member = await MerchantMember.findOne({
      where: {
        id: memberId,
        merchantId,
      },
      include: [
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
        },
      ],
      transaction,
    });

    if (!member) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Check if member is the owner
    const isOwner = member.roles.some((role) => role.name === "OWNER");

    if (isOwner) {
      // Check if there are other owners
      const ownerMembers = await MerchantMember.findAll({
        where: { merchantId },
        include: [
          {
            model: Role,
            as: "roles",
            where: { name: "OWNER" },
            through: { attributes: [] },
          },
        ],
        transaction,
      });

      if (ownerMembers.length <= 1) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: "Cannot remove the only owner of the merchant",
        });
      }
    }

    // Remove all role assignments
    await MerchantMemberRole.destroy({
      where: { merchantMemberId: memberId },
      transaction,
    });

    // Update member status
    await member.update({ status: "REMOVED" }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: {
        memberId,
        status: "REMOVED",
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Remove member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove member",
    });
  }
};
