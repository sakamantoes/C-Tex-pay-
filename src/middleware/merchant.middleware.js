import { Merchant, MerchantMember, BusinessProfile } from "../models/index.js";
import { Op } from "sequelize";

export const requireMerchant = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Find active membership for this user
    const merchantMember = await MerchantMember.findOne({
      where: {
        userId,
        status: {
          [Op.in]: ["ACTIVE", "INVITED"],
        },
      },
      include: [
        {
          model: Merchant,
          as: "merchant",
          where: {
            status: "ACTIVE",
          },
          required: true,
          include: [
            {
              model: BusinessProfile,
              as: "businessProfile",
            },
          ],
        },
      ],
    });

    if (!merchantMember) {
      return res.status(403).json({
        success: false,
        message: "No active merchant membership found",
      });
    }

    if (!merchantMember.merchant) {
      return res.status(403).json({
        success: false,
        message: "Merchant not found or inactive",
      });
    }

    // Attach to request
    req.merchant = merchantMember.merchant;
    req.merchantMember = merchantMember;
    req.businessProfile = merchantMember.merchant.businessProfile;

    next();
  } catch (error) {
    console.error("Merchant middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const requireMerchantOwner = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const merchant = req.merchant;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!merchant) {
      return res.status(403).json({
        success: false,
        message: "Merchant context required",
      });
    }

    if (merchant.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the merchant owner can perform this action",
      });
    }

    next();
  } catch (error) {
    console.error("Merchant owner middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

export const requireMerchantParam = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const merchantId = req.params.merchantId || req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID required",
      });
    }

    // Verify user is a member of this specific merchant
    const merchantMember = await MerchantMember.findOne({
      where: {
        userId,
        merchantId,
        status: "ACTIVE",
      },
      include: [
        {
          model: Merchant,
          as: "merchant",
          where: {
            status: "ACTIVE",
          },
          required: true,
          include: [
            {
              model: BusinessProfile,
              as: "businessProfile",
            },
          ],
        },
      ],
    });

    if (!merchantMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this merchant",
      });
    }

    if (!merchantMember.merchant) {
      return res.status(403).json({
        success: false,
        message: "Merchant not found or inactive",
      });
    }

    req.merchant = merchantMember.merchant;
    req.merchantMember = merchantMember;
    req.businessProfile = merchantMember.merchant.businessProfile;

    next();
  } catch (error) {
    console.error("Merchant param middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};