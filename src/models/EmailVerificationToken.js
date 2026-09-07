import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const EmailVerificationToken = sequelize.define(
  "EmailVerificationToken",
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

    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },

    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
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
    tableName: "email_verification_tokens",

    timestamps: true,

    indexes: [
      {
        unique: true,
        name: "email_verification_tokens_token_unique",
        fields: ["token"],
      },

      {
        name: "email_verification_tokens_user_id_index",
        fields: ["user_id"],
      },

      {
        name: "email_verification_tokens_expires_at_index",
        fields: ["expires_at"],
      },
    ],
  }
);

export default EmailVerificationToken;

