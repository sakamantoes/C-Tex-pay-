import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * LedgerEntry — a single debit/credit line.
 *
 * Direction:
 *   DEBIT  — increases assets / decreases liabilities
 *   CREDIT — decreases assets / increases liabilities
 *
 * For our simplified model:
 *   MERCHANT_AVAILABLE credit → merchant earns
 *   MERCHANT_AVAILABLE debit  → merchant is paid out
 *   CTEX_FEE_REVENUE  credit → C-TEX earns
 *   CLEARING          debit  → funds leaving clearing to merchant+CTEX
 *
 * Amounts are integer kobo. Never floating point.
 */
const LedgerEntry = sequelize.define(
  "LedgerEntry",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ledgerTransactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "ledger_transactions", key: "id" },
    },
    ledgerAccountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "ledger_accounts", key: "id" },
    },
    direction: {
      type: DataTypes.ENUM("DEBIT", "CREDIT"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Integer minor units (kobo for NGN)",
      validate: { min: 1 },
    },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "ledger_entries",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["ledgerTransactionId"] },
      { fields: ["ledgerAccountId"] },
      { fields: ["currency"] },
    ],
  }
);

export default LedgerEntry;