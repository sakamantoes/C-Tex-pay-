import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const CustomerPaymentMethod = sequelize.define(
  "CustomerPaymentMethod",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "customers",
        key: "id",
      },
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    providerCustomerReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    providerPaymentMethodReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("card", "bank", "wallet", "cash", "other"),
      allowNull: false,
      defaultValue: "card",
    },
    brand: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    last4: {
      type: DataTypes.STRING(4),
      allowNull: true,
    },
    expiryMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 12,
      },
    },
    expiryYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 2024,
      },
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE", "DELETED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "customer_payment_methods",
    timestamps: true,
  }
);

export default CustomerPaymentMethod;
