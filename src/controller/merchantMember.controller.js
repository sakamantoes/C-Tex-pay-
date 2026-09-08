import {
  MerchantMember,
  Role,
  MerchantMemberRole,
  User
} from "../models/index.js";
import sequelize from "../config/database.js";
import { Op } from "sequelize";

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
    const { roleId } = req.body;

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