import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MerchantSetting = sequelize.define(
  "MerchantSetting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "merchants", key: "id" },
      onDelete: "CASCADE",
    },
    notifyPaymentSuccessInApp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notifyPaymentSuccessEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notificationEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isEmail: true },
    },
  },
  {
    tableName: "merchant_settings",
    timestamps: true,
    indexes: [{ fields: ["merchantId"], unique: true }],
  },
);

export default MerchantSetting;
