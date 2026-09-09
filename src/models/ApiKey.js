import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ApiKey = sequelize.define(
  "ApiKey",
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    keyPrefix: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    keyHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    environment: {
      type: DataTypes.ENUM("TEST", "LIVE"),
      allowNull: false,
      defaultValue: "TEST",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "REVOKED", "EXPIRED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "api_keys",
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ["keyHash"],
        unique: true,
      },
      {
        fields: ["merchantId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["environment"],
      },
      {
        fields: ["expiresAt"],
      },
      {
        fields: ["revokedAt"],
      },
    ],
  }
);

export default ApiKey;