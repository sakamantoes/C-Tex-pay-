import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * FeeRecord — immutable per-payment snapshot.
 *
 * Created once, at payment initialization, inside the same DB transaction
 * that creates the Payment. Never updated afterward.
 *
 * Historical fee data must remain readable even if the originating
 * FeeConfiguration is later deactivated or modified.
 */
const FeeRecord = sequelize.define(
  "FeeRecord",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "payments", key: "id" },
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "merchants", key: "id" },
    },
    feeConfigurationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "fee_configurations", key: "id" },
      comment: "NULL if a config was missing at init time",
    },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
    },
    grossAmount: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Kobo — what the customer pays",
    },
    serviceFee: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "C-TEX PAY revenue in kobo",
    },
    providerFee: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "Kobo — known only after provider confirms",
    },
    totalFee: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "= serviceFee. Merchant-charged amount.",
    },
    merchantNetAmount: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "= grossAmount - totalFee",
    },
    providerFeeTreatment: {
      type: DataTypes.ENUM("ABSORBED", "PASSED_TO_MERCHANT", "UNKNOWN"),
      allowNull: false,
      defaultValue: "UNKNOWN",
    },
    feeBreakdown: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Full calculation snapshot for audit",
    },
    calculationVersion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "v1",
    },
  },
  {
    tableName: "fee_records",
    timestamps: true,
    updatedAt: false, // immutable
    indexes: [
      { fields: ["paymentId"], unique: true },
      { fields: ["merchantId"] },
      { fields: ["feeConfigurationId"] },
      { fields: ["createdAt"] },
    ],
  }
);

export default FeeRecord;