import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ReconciliationRun = sequelize.define(
  "ReconciliationRun",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    reconciliationType: {
      type: DataTypes.ENUM("PAYMENTS", "PAYOUTS", "FULL"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalRecords: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    matchedRecords: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    mismatchedRecords: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    missingInternalRecords: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    missingProviderRecords: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    amountMismatches: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    statusMismatches: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    errorCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    triggeredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    lastError: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
  },
  {
    tableName: "reconciliation_runs",
    timestamps: true,
    indexes: [
      { fields: ["provider", "status"] },
      { fields: ["reconciliationType"] },
      { fields: ["periodStart", "periodEnd"] },
      { fields: ["merchantId"] },
      { fields: ["createdAt"] },
    ],
  }
);

export default ReconciliationRun;