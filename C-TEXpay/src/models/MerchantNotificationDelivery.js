import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MerchantNotificationDelivery = sequelize.define(
  "MerchantNotificationDelivery",
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
      onDelete: "CASCADE",
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "payments", key: "id" },
      onDelete: "CASCADE",
    },
    eventKey: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    recipientEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true },
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "PROCESSING",
        "RETRYING",
        "SENT",
        "FAILED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // null once the delivery reaches a terminal state (SENT or FAILED).
    nextAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    processingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastError: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "merchant_notification_deliveries",
    timestamps: true,
    indexes: [
      { fields: ["status", "nextAttemptAt"] },
      { fields: ["merchantId", "createdAt"] },
    ],
  }
);

export default MerchantNotificationDelivery;