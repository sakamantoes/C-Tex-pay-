import { Op } from "sequelize";
import {
  Role,
  Permission,
  RolePermission,
  Merchant
} from "../models/index.js";
import sequelize from "../config/database.js";

export const createRole = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const { name, description } = req.body;

    // Check for duplicate role name within merchant
    const existingRole = await Role.findOne({
      where: {
        merchantId,
        name,
      },
      transaction,
    });

    if (existingRole) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Role "${name}" already exists for this merchant`,
      });
    }

    const role = await Role.create(
      {
        merchantId,
        name,
        description: description || null,
        isSystemRole: false,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: {
        role,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create role error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create role",
    });
  }
};

export const getRoles = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const roles = await Role.findAll({
      where: { merchantId },
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
          attributes: ["id", "key", "name", "resource", "action"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: {
        roles,
        count: roles.length,
      },
    });
  } catch (error) {
    console.error("Get roles error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get roles",
    });
  }
};

export const getRole = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const roleId = req.params.id;

    const role = await Role.findOne({
      where: {
        id: roleId,
        merchantId,
      },
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
          attributes: ["id", "key", "name", "resource", "action"],
        },
      ],
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        role,
      },
    });
  } catch (error) {
    console.error("Get role error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get role",
    });
  }
};

export const updateRole = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const roleId = req.params.id;
    const { name, description } = req.body;

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

    // Prevent modifying system roles
    if (role.isSystemRole) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "System roles cannot be modified",
      });
    }

    // Check for duplicate name if changing name
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        where: {
          merchantId,
          name,
          id: { [Op.ne]: roleId },
        },
        transaction,
      });

      if (existingRole) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: `Role "${name}" already exists for this merchant`,
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    await role.update(updateData, { transaction });

    await transaction.commit();

    const updatedRole = await Role.findByPk(roleId, {
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: {
        role: updatedRole,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update role error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update role",
    });
  }
};

export const deleteRole = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const roleId = req.params.id;

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

    // Prevent deleting system roles
    if (role.isSystemRole) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "System roles cannot be deleted",
      });
    }

    // Check if role is assigned to any members
    const memberCount = await role.countMembers({ transaction });
    if (memberCount > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Cannot delete role. It is assigned to ${memberCount} member(s).`,
      });
    }

    // Delete role permissions first
    await RolePermission.destroy({
      where: { roleId },
      transaction,
    });

    // Delete role
    await role.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete role error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete role",
    });
  }
};

export const assignPermissionToRole = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const roleId = req.params.id;
    const permissionId = req.params.permissionId;

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

    // Verify permission exists
    const permission = await Permission.findByPk(permissionId, { transaction });
    if (!permission) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    // Check if already assigned
    const existingAssignment = await RolePermission.findOne({
      where: {
        roleId,
        permissionId,
      },
      transaction,
    });

    if (existingAssignment) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "Permission is already assigned to this role",
      });
    }

    await RolePermission.create(
      {
        roleId,
        permissionId,
      },
      { transaction }
    );

    await transaction.commit();

    const updatedRole = await Role.findByPk(roleId, {
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Permission assigned to role successfully",
      data: {
        role: updatedRole,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Assign permission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign permission",
    });
  }
};

export const removePermissionFromRole = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const roleId = req.params.id;
    const permissionId = req.params.permissionId;

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

    // Find the assignment
    const assignment = await RolePermission.findOne({
      where: {
        roleId,
        permissionId,
      },
      transaction,
    });

    if (!assignment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Permission is not assigned to this role",
      });
    }

    await assignment.destroy({ transaction });

    await transaction.commit();

    const updatedRole = await Role.findByPk(roleId, {
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Permission removed from role successfully",
      data: {
        role: updatedRole,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Remove permission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove permission",
    });
  }
};