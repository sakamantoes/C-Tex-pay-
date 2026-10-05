import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * LedgerAccount
 *
 * A financial account involved in ledger postings.
 *
 * Types:
 *   MERCHANT_AVAILABLE      — merchant's withdrawable balance
 *   MERCHANT_PENDING        — merchant's held funds (future use)
 *   CTEX_FEE_REVENUE        — C-TEX service fee income
 *   CTEX_PROVIDER_EXPENSE   — C-TEX provider cost expense
 *   CLEARING                — in-transit funds
 *
 * Merchant-scoped accounts require merchantId; platform accounts do not.
 */
const LedgerAccount = sequelize.define(
  "LedgerAccount",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM(
        "MERCHANT_AVAILABLE",
        "MERCHANT_PENDING",
        "CTEX_FEE_REVENUE",
        "CTEX_PROVIDER_EXPENSE",
        "CLEARING"
      ),
      allowNull: false,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
    },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
  },
  {
    tableName: "ledger_accounts",
    timestamps: true,
    indexes: [
      // Merchant-scoped accounts: one per (merchant, type, currency).
      // Platform accounts (merchantId NULL): one per (type, currency).
      // MariaDB treats NULL as distinct in unique indexes, so we use two
      // separate indexes to cover both cases cleanly.
      {
        name: "ledger_accounts_merchant_unique",
        fields: ["merchantId", "type", "currency"],
        unique: true,
        where: { merchantId: { [Symbol.for("op.not")]: null } },
      },
      { fields: ["type", "currency"] },
      { fields: ["merchantId"] },
    ],
  }
);

export default LedgerAccount;