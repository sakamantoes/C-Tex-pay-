import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const RolePermission = sequelize.define(
  "RolePermission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "roles",
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
    tableName: "role_permissions",
    timestamps: true,
    indexes: [
      {
        fields: ["roleId", "permissionId"],
        unique: true,
      },
      {
        fields: ["roleId"],
      },
      {
        fields: ["permissionId"],
      },
    ],
  }
);

export default RolePermission;