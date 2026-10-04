import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MerchantInvitation = sequelize.define(
  "MerchantInvitation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "merchants", key: "id" },
      onDelete: "CASCADE",
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "roles", key: "id" },
      onDelete: "RESTRICT",
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "merchant_invitations",
    timestamps: true,
    indexes: [
      { fields: ["merchantId", "email"] },
      { fields: ["token"], unique: true },
      { fields: ["expiresAt"] },
    ],
  },
);

export default MerchantInvitation;
