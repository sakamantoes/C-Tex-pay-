import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MerchantWebhookConfig = sequelize.define(
  "MerchantWebhookConfig",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: "merchants",
        key: "id",
      },
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    secretEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Encrypted merchant webhook secret used for outbound HMAC signing",
    },
    secretHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: "SHA-256 hash of the raw secret for integrity checks and comparisons",
    },
    lastDeliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "merchant_webhook_configs",
    timestamps: true,
    indexes: [
      { fields: ["merchantId"], unique: true },
      { fields: ["enabled"] },
      { fields: ["lastDeliveredAt"] },
    ],
  }
);

export default MerchantWebhookConfig;
