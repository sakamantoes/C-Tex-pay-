import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * PaymentLink
 *
 * A shareable payment URL a merchant can send to customers.
 *
 * - amountType: FIXED → amount is set by merchant (kobo, non-null)
 *               CUSTOM → customer enters amount (kobo, amount is null)
 * - status: ACTIVE | INACTIVE | ARCHIVED
 * - allowMultiplePayments: default true
 * - consumedAt: set when a single-use link receives a trusted successful payment
 */
const PaymentLink = sequelize.define(
  "PaymentLink",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "merchants", key: "id" },
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 120] },
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    slug: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    amountType: {
      type: DataTypes.ENUM("FIXED", "CUSTOM"),
      allowNull: false,
      defaultValue: "FIXED",
    },
    amount: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "Kobo — required for FIXED links, NULL for CUSTOM links",
    },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    paymentMethod: {
      type: DataTypes.ENUM("ACCOUNT_TRANSFER"),
      allowNull: false,
      defaultValue: "ACCOUNT_TRANSFER",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE", "ARCHIVED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    allowMultiplePayments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment:
        "Set when a single-use link receives its first trusted successful payment",
    },
  },
  {
    tableName: "payment_links",
    timestamps: true,
    indexes: [
      { fields: ["slug"], unique: true },
      { fields: ["merchantId", "status"] },
      { fields: ["merchantId", "createdAt"] },
      { fields: ["status"] },
    ],
  }
);

export default PaymentLink;