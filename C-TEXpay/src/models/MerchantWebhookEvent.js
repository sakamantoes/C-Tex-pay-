import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MerchantWebhookEvent = sequelize.define(
  "MerchantWebhookEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "merchants",
        key: "id",
      },
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "payments",
        key: "id",
      },
    },
    configId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "merchant_webhook_configs",
        key: "id",
      },
    },
    eventId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "payment.success",
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "RETRYING", "DELIVERED", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    responseStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    responseBody: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "merchant_webhook_events",
    timestamps: true,
    indexes: [
      { fields: ["merchantId", "eventType"] },
      { fields: ["paymentId", "eventType"], unique: true, name: "merchant_webhook_events_payment_event_unique" },
      { fields: ["status", "nextRetryAt"] },
      { fields: ["eventId"], unique: true },
      { fields: ["configId"] },
    ],
  }
);

export default MerchantWebhookEvent;
