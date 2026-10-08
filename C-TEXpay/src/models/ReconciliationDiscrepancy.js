import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ReconciliationDiscrepancy = sequelize.define(
  "ReconciliationDiscrepancy",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reconciliationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "reconciliation_runs", key: "id" },
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "MISSING_PROVIDER_RECORD",
        "MISSING_INTERNAL_RECORD",
        "STATUS_MISMATCH",
        "AMOUNT_MISMATCH",
        "CURRENCY_MISMATCH",
        "DUPLICATE_PROVIDER_RECORD",
        "DUPLICATE_INTERNAL_RECORD",
        "REFERENCE_MISMATCH",
        "UNKNOWN_PROVIDER_TRANSACTION"
      ),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
      allowNull: false,
      defaultValue: "MEDIUM",
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "payments", key: "id" },
    },
    payoutId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "payouts", key: "id" },
    },
    internalReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    providerReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    internalStatus: { type: DataTypes.STRING(50), allowNull: true },
    providerStatus: { type: DataTypes.STRING(50), allowNull: true },
    internalAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    providerAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: true },
    status: {
      type: DataTypes.ENUM("OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"),
      allowNull: false,
      defaultValue: "OPEN",
    },
    reason: { type: DataTypes.STRING(500), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    resolutionNote: { type: DataTypes.STRING(1000), allowNull: true },
  },
  {
    tableName: "reconciliation_discrepancies",
    timestamps: true,
    indexes: [
      {
        name: "recon_disc_unique_open",
        fields: ["reconciliationId", "providerReference", "type"],
      },
      { fields: ["reconciliationId"] },
      { fields: ["merchantId"] },
      { fields: ["status"] },
      { fields: ["severity"] },
      { fields: ["type"] },
      { fields: ["paymentId"] },
      { fields: ["payoutId"] },
    ],
  }
);

export default ReconciliationDiscrepancy;