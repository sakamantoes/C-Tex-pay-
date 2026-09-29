import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Webhook Event Deduplication Table
 *
 * Stores each processed provider webhook event. A unique constraint
 * on (provider, event_key) prevents duplicate processing when the
 * provider retries delivery.
 *
 * event_key:
 *   Stable identifier derived from the webhook payload. For Monnify
 *   SUCCESSFUL_TRANSACTION events, this is the transactionReference.
 *   For other events, a hash of (eventType + eventData) is used.
 */

const WebhookEvent = sequelize.define(
  "WebhookEvent",
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
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    eventKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "webhook_events",
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ["provider", "eventKey"],
        unique: true,
        name: "webhook_events_provider_eventkey_unique",
      },
      {
        fields: ["provider", "eventType"],
      },
      {
        fields: ["processedAt"],
      },
    ],
  }
);

export default WebhookEvent;