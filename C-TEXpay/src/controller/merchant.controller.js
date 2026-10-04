import {
  Merchant,
  BusinessProfile,
  MerchantMember,
  Role,
  MerchantMemberRole,
  Permission,
  User
} from "../models/index.js";
import sequelize from "../config/database.js";
import { generateMerchantCode } from "../utils/merchant.utils.js";

export const createMerchant = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      businessName,
      businessType,
      email,
      phone,
      website,
      country,
      state,
      city,
      address,
      description,
    } = req.body;

    // Membership in someone else's merchant must not block account creation.
    const existingMerchant = await Merchant.findOne({
      where: { ownerId: userId },
      transaction,
    });

    if (existingMerchant) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "User already owns a merchant account",
      });
    }

    // Generate merchant code
    const merchantCode = await generateMerchantCode();

    // 1. Create Merchant
    const merchant = await Merchant.create(
      {
        ownerId: userId,
        merchantCode,
        status: "ACTIVE",
        onboardingStatus: "NOT_STARTED",
      },
      { transaction }
    );

    // Promote the account to merchant after successfully creating its merchant.
    await User.update(
      { role: "MERCHANT" },
      {
        where: { id: userId },
        transaction,
      }
    );

    // 2. Create BusinessProfile
    const businessProfile = await BusinessProfile.create(
      {
        merchantId: merchant.id,
        businessName,
        businessType: businessType || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        country: country || null,
        state: state || null,
        city: city || null,
        address: address || null,
        description: description || null,
      },
      { transaction }
    );

    // 3. Create MerchantMember for owner
    const merchantMember = await MerchantMember.create(
      {
        merchantId: merchant.id,
        userId,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      { transaction }
    );

    // 4. Create OWNER role
    const ownerRole = await Role.create(
      {
        merchantId: merchant.id,
        name: "OWNER",
        description: "Merchant owner with full access",
        isSystemRole: true,
      },
      { transaction }
    );

    // 5. Assign owner role to member
    await MerchantMemberRole.create(
      {
        merchantMemberId: merchantMember.id,
        roleId: ownerRole.id,
      },
      { transaction }
    );

    // 6. Assign all permissions to owner role
    const allPermissions = await Permission.findAll({ transaction });
    await ownerRole.setPermissions(allPermissions, { transaction });

    await transaction.commit();

    // Fetch complete data for response
    const completeMerchant = await Merchant.findByPk(merchant.id, {
      include: [
        {
          model: BusinessProfile,
          as: "businessProfile",
        },
        {
          model: MerchantMember,
          as: "members",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email", "phone"],
            },
          ],
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Merchant created successfully",
      data: {
        merchant: completeMerchant,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create merchant error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Merchant code conflict. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create merchant",
    });
  }
};

export const getMyMerchant = async (req, res) => {
  try {
    const merchant = req.merchant;

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    const completeMerchant = await Merchant.findByPk(merchant.id, {
      include: [
        {
          model: BusinessProfile,
          as: "businessProfile",
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
        {
          model: MerchantMember,
          as: "members",
          attributes: ["id", "status", "joinedAt"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email", "phone"],
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        merchant: completeMerchant,
      },
    });
  } catch (error) {
    console.error("Get merchant error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get merchant",
    });
  }
};

export const updateMyMerchant = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchant = req.merchant;
    const { status, onboardingStatus } = req.body;

    // Only allow specific fields to be updated
    const updateData = {};
    if (status) updateData.status = status;
    if (onboardingStatus) updateData.onboardingStatus = onboardingStatus;

    if (Object.keys(updateData).length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    await merchant.update(updateData, { transaction });

    await transaction.commit();

    const updatedMerchant = await Merchant.findByPk(merchant.id, {
      include: [
        {
          model: BusinessProfile,
          as: "businessProfile",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Merchant updated successfully",
      data: {
        merchant: updatedMerchant,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update merchant error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update merchant",
    });
  }
};

export const getBusinessProfile = async (req, res) => {
  try {
    const businessProfile = req.businessProfile;

    if (!businessProfile) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        businessProfile,
      },
    });
  } catch (error) {
    console.error("Get business profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get business profile",
    });
  }
};

export const updateBusinessProfile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const businessProfile = req.businessProfile;

    if (!businessProfile) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    const {
      businessName,
      businessType,
      email,
      phone,
      website,
      country,
      state,
      city,
      address,
      logoUrl,
      description,
    } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessType !== undefined) updateData.businessType = businessType;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (country !== undefined) updateData.country = country;
    if (state !== undefined) updateData.state = state;
    if (city !== undefined) updateData.city = city;
    if (address !== undefined) updateData.address = address;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    await businessProfile.update(updateData, { transaction });

    await transaction.commit();

    const updatedProfile = await BusinessProfile.findByPk(businessProfile.id);

    return res.status(200).json({
      success: true,
      message: "Business profile updated successfully",
      data: {
        businessProfile: updatedProfile,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update business profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update business profile",
    });
  }
};

export const getMyMembership = async (req, res) => {
  try {
    const merchantMember = req.merchantMember;

    if (!merchantMember) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    const membership = await MerchantMember.findByPk(merchantMember.id, {
      attributes: ["id", "merchantId", "status", "joinedAt", "createdAt"],
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["id", "name", "description", "isSystemRole"],
          through: { attributes: [] },
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["key"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    // Extract permissions
    const permissions = [];
    const roles = membership.roles || [];
    for (const role of roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          if (!permissions.includes(perm.key)) {
            permissions.push(perm.key);
          }
        }
      }
    }

    const responseData = {
      membership: {
        id: membership.id,
        status: membership.status,
        joinedAt: membership.joinedAt,
        createdAt: membership.createdAt,
        merchantId: membership.merchantId,
      },
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystemRole: role.isSystemRole,
      })),
      permissions,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Get membership error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get membership",
    });
  }
};

export const getMyMemberships = async (req, res) => {
  try {
    const memberships = await MerchantMember.findAll({
      where: {
        userId: req.user.id,
        status: "ACTIVE",
      },
      attributes: ["id", "merchantId", "status", "joinedAt"],
      include: [
        {
          model: Merchant,
          as: "merchant",
          attributes: ["id", "ownerId"],
          where: { status: "ACTIVE" },
          required: true,
        },
        {
          model: Role,
          as: "roles",
          attributes: ["id", "name"],
          through: { attributes: [] },
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["key"],
              through: { attributes: [] },
            },
          ],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const data = memberships.map((membership) => {
      const roles = membership.roles || [];
      const permissions = [...new Set(
        roles.flatMap((role) => (role.permissions || []).map((permission) => permission.key)),
      )];

      return {
        id: membership.id,
        merchantId: membership.merchantId,
        status: membership.status,
        joinedAt: membership.joinedAt,
        isOwner: membership.merchant.ownerId === req.user.id,
        roles: roles.map(({ id, name }) => ({ id, name })),
        permissions,
      };
    });

    return res.status(200).json({
      success: true,
      data: { memberships: data },
    });
  } catch (error) {
    console.error("List user memberships error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get memberships",
    });
  }
};