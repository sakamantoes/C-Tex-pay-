import { Merchant, MerchantMember, BusinessProfile } from "../models/index.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const merchantInclude = {
  model: Merchant,
  as: "merchant",
  attributes: ["id", "ownerId", "status"],
  where: { status: "ACTIVE" },
  required: true,
  include: [
    {
      model: BusinessProfile,
      as: "businessProfile",
    },
  ],
};

export const requireMerchant = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const requestedMerchantId = req.get("x-merchant-id")?.trim();
    if (requestedMerchantId && !UUID_PATTERN.test(requestedMerchantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid merchant workspace",
      });
    }

    const memberships = await MerchantMember.findAll({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: [merchantInclude],
      order: [["createdAt", "ASC"]],
    });

    if (memberships.length === 0) {
      return res.status(403).json({
        success: false,
        message: "No active merchant membership found",
      });
    }

    let merchantMember;
    if (requestedMerchantId) {
      merchantMember = memberships.find(
        (membership) => membership.merchantId === requestedMerchantId,
      );
      if (!merchantMember) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this merchant workspace",
        });
      }
    } else {
      const ownedMemberships = memberships.filter(
        (membership) => membership.merchant?.ownerId === userId,
      );

      if (ownedMemberships.length === 1) {
        [merchantMember] = ownedMemberships;
      } else if (memberships.length === 1) {
        [merchantMember] = memberships;
      } else {
        return res.status(409).json({
          success: false,
          message: "Select a merchant workspace using the X-Merchant-Id header",
        });
      }
    }

    if (!merchantMember?.merchant) {
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

export const requireOwnedMerchant = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const merchant = await Merchant.findOne({
      where: { ownerId: userId, status: "ACTIVE" },
      include: [
        {
          model: BusinessProfile,
          as: "businessProfile",
        },
      ],
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    req.merchant = merchant;
    req.businessProfile = merchant.businessProfile;
    next();
  } catch (error) {
    console.error("Owned merchant middleware error:", error);
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