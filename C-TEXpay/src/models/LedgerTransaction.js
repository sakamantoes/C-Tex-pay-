import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * LedgerTransaction — a financial event.
 *
 * Immutable once posted. Corrections use compensating transactions.
 *
 * Reference is the idempotency key. Unique per (reference, currency).
 */
const LedgerTransaction = sequelize.define(
  "LedgerTransaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reference: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: "Deterministic idempotency key, e.g. PAYMENT_SETTLEMENT:<paymentId>",
    },
    type: {
      type: DataTypes.ENUM(
        "PAYMENT_SETTLEMENT",
        "PROVIDER_COST",
        "REFUND",
        "REVERSAL",
        "ADJUSTMENT",
        "PAYOUT"
      ),
      allowNull: false,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
      comment: "NULL for internal-only transactions (e.g. some adjustments)",
    },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    status: {
      type: DataTypes.ENUM("POSTED", "REVERSED"),
      allowNull: false,
      defaultValue: "POSTED",
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "payments", key: "id" },
      comment: "Linked payment where applicable",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "ledger_transactions",
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        name: "ledger_transactions_reference_unique",
        fields: ["reference", "currency"],
        unique: true,
      },
      { fields: ["merchantId"] },
      { fields: ["type"] },
      { fields: ["paymentId"] },
      { fields: ["postedAt"] },
    ],
  }
);

export default LedgerTransaction;