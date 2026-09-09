import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ApiKeyUsage = sequelize.define(
  "ApiKeyUsage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    apiKeyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "api_keys",
        key: "id",
      },
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "merchants",
        key: "id",
      },
    },
    requestId: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Response time in milliseconds",
    },
  },
  {
    tableName: "api_key_usage",
    timestamps: true,
    indexes: [
      {
        fields: ["apiKeyId"],
      },
      {
        fields: ["merchantId"],
      },
      {
        fields: ["createdAt"],
      },
      {
        fields: ["statusCode"],
      },
      {
        fields: ["requestId"],
      },
    ],
  }
);

export default ApiKeyUsage;