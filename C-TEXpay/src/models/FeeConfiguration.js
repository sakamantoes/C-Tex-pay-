import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * FeeConfiguration
 *
 * Represents a pricing rule for C-TEX PAY service fees.
 *
 * Scope:
 *   - merchantId NULL  → platform-wide (admin-managed)
 *   - merchantId set   → merchant-specific override
 *
 * Rate is stored as BASIS POINTS (integer).
 *   100  = 1.00%
 *   50   = 0.50%
 *   0    = no percentage component
 *
 * Amounts (fixedAmount, minimumFee, maximumFee) are in minor units (kobo).
 *
 * Precedence when multiple configs match:
 *   1. merchant + currency + paymentMethod
 *   2. merchant + currency + NULL method
 *   3. NULL merchant + currency + paymentMethod
 *   4. NULL merchant + currency + NULL method
 */
const FeeConfiguration = sequelize.define(
  "FeeConfiguration",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
      comment: "NULL = platform-wide default",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] },
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    paymentMethod: {
      type: DataTypes.ENUM("ACCOUNT_TRANSFER"),
      allowNull: true,
      comment: "NULL = applies to all methods",
    },
    feeType: {
      type: DataTypes.ENUM("PERCENTAGE", "FIXED", "PERCENTAGE_PLUS_FIXED"),
      allowNull: false,
    },
    percentageRateBps: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "Basis points. 100 = 1%",
      validate: { min: 0, max: 100_00 }, // max 100%
    },
    fixedAmount: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "Minor units (kobo)",
    },
    minimumFee: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    maximumFee: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "NULL = no cap",
    },
    providerFeeTreatment: {
      type: DataTypes.ENUM("ABSORBED", "PASSED_TO_MERCHANT", "UNKNOWN"),
      allowNull: false,
      defaultValue: "UNKNOWN",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    effectiveFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    effectiveUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  },
  {
    tableName: "fee_configurations",
    timestamps: true,
    indexes: [
      { fields: ["merchantId", "status"] },
      { fields: ["currency", "status"] },
      { fields: ["effectiveFrom", "effectiveUntil"] },
    ],
  }
);

export default FeeConfiguration;