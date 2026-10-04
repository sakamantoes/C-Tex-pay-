import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/*
|--------------------------------------------------------------------------
| Accepts:  "https://example.com"
|           "http://example.com"
|           "www.example.com"    (auto-prefixed by frontend, but tolerate)
|           null / ""            (allowed)
| Rejects:  "not a url"
|--------------------------------------------------------------------------
*/
const urlOrEmpty = (value) => {
  if (value === null || value === undefined || value === "") return;
  const v = String(value).trim();
  if (!/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(v)) {
    throw new Error("Invalid URL");
  }
};

const BusinessProfile = sequelize.define(
  "BusinessProfile",
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
      references: {
        model: "merchants",
        key: "id",
      },
    },
    businessName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255],
      },
    },
    businessType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmailOrEmpty(value) {
          if (!value) return;
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error("Invalid email");
          }
        },
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        urlOrEmpty: urlOrEmpty,
      },
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        urlOrEmpty: urlOrEmpty,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "business_profiles",
    timestamps: true,
    indexes: [
      {
        fields: ["merchantId"],
        unique: true,
      },
      {
        fields: ["businessName"],
      },
    ],
  }
);

export default BusinessProfile;