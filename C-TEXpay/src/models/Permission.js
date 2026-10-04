import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Permission = sequelize.define(
  "Permission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 100],
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    action: {
      type: DataTypes.ENUM(
        "read",
        "create",
        "update",
        "delete",
        "manage",
        "revoke",
        "refund"
      ),
      allowNull: false,
    },
  },
  {
    tableName: "permissions",
    timestamps: true,
    indexes: [
      {
        fields: ["key"],
        unique: true,
      },
      {
        fields: ["resource"],
      },
      {
        fields: ["action"],
      },
    ],
  }
);

export default Permission;