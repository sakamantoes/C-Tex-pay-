import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MerchantMember = sequelize.define(
  "MerchantMember",
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INVITED", "SUSPENDED", "REMOVED"),
      defaultValue: "ACTIVE",
      allowNull: false,
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "merchant_members",
    timestamps: true,
    indexes: [
      {
        fields: ["merchantId", "userId"],
        unique: true,
      },
      {
        fields: ["merchantId"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

export default MerchantMember;