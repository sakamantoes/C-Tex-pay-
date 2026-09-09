import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ApiKeyPermission = sequelize.define(
  "ApiKeyPermission",
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
    permissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "permissions",
        key: "id",
      },
    },
  },
  {
    tableName: "api_key_permissions",
    timestamps: true,
    indexes: [
      {
        fields: ["apiKeyId", "permissionId"],
        unique: true,
      },
      {
        fields: ["apiKeyId"],
      },
      {
        fields: ["permissionId"],
      },
    ],
  }
);

export default ApiKeyPermission;