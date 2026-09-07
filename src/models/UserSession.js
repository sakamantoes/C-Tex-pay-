import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const UserSession = sequelize.define(
  "UserSession",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",

      references: {
        model: "users",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    refreshToken: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: "refresh_token",

      references: {
        model: "refresh_tokens",
        key: "token",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "ip_address",
    },

    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "user_agent",
    },

    deviceName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "device_name",
    },

    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      field: "last_activity_at",
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },

    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },

  {
    tableName: "user_sessions",

    timestamps: true,

    indexes: [
      {
        name: "user_sessions_user_id_index",
        fields: ["user_id"],
      },

      {
        name: "user_sessions_refresh_token_index",
        fields: ["refresh_token"],
      },

      {
        name: "user_sessions_expires_at_index",
        fields: ["expires_at"],
      },

      {
        name: "user_sessions_revoked_at_index",
        fields: ["revoked_at"],
      },
    ],
  }
);

export default UserSession;

