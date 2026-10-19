import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Payout — merchant withdrawal request.
 *
 * Lifecycle:
 *   PENDING     — created, funds reserved in ledger
 *   PROCESSING  — sent to provider, awaiting confirmation
 *   SUCCESS     — provider confirmed, funds cleared
 *   FAILED      — provider rejected or errored, funds released
 *   REVERSED    — success reversed (via webhook or admin action)
 *
 * Money in kobo (integer minor units). No floating point.
 */
const Payout = sequelize.define(
  "Payout",
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
    amount: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Integer kobo — amount requested for withdrawal",
      validate: { min: 1 },
    },
    feeMode: {
      type: DataTypes.ENUM("FEE_ON_TOP", "DEDUCT_FROM_AMOUNT"),
      allowNull: false,
      defaultValue: "FEE_ON_TOP",
    },
    feeAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    walletDebitAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    beneficiaryAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    feeConfigurationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "fee_configurations", key: "id" },
    },
    feeSnapshot: { type: DataTypes.JSON, allowNull: true },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    bankCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    accountNumber: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    accountNumberLast4: { type: DataTypes.STRING(4), allowNull: true },
    accountName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    narration: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    merchantReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    requestHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: "SHA-256 of canonical request — detects key reuse with different payload",
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    providerReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    providerStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    providerMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "PROCESSING",
        "SUCCESS",
        "FAILED",
        "REVERSED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    failureCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    failureReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    reserveLedgerTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "ledger_transactions", key: "id" },
      comment: "Ledger tx that moved funds from AVAILABLE → PENDING on request",
    },
    settleLedgerTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "ledger_transactions", key: "id" },
      comment: "Ledger tx that moved funds from PENDING → CLEARING on success",
    },
    initiatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    processingAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    failedAt: { type: DataTypes.DATE, allowNull: true },
    reversedAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "payouts",
    timestamps: true,
    indexes: [
      {
        name: "payouts_merchant_idempotency_unique",
        fields: ["merchantId", "idempotencyKey"],
        unique: true,
      },
      {
        name: "payouts_provider_reference_unique",
        fields: ["provider", "providerReference"],
        unique: true,
      },
      { fields: ["merchantId", "createdAt"] },
      { fields: ["status"] },
      { fields: ["providerReference"] },
      { fields: ["initiatedAt"] },
    ],
  }
);

export default Payout;
