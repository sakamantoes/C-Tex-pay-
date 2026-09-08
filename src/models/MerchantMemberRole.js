import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MerchantMemberRole = sequelize.define(
  "MerchantMemberRole",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantMemberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "merchant_members",
        key: "id",
      },
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "roles",
        key: "id",
      },
    },
  },
  {
    tableName: "merchant_member_roles",
    timestamps: true,
    indexes: [
      {
        fields: ["merchantMemberId", "roleId"],
        unique: true,
      },
      {
        fields: ["merchantMemberId"],
      },
      {
        fields: ["roleId"],
      },
    ],
  }
);

export default MerchantMemberRole;