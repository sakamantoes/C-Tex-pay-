import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Merchant = sequelize.define(
  "Merchant",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    merchantCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    onboardingStatus: {
      type: DataTypes.ENUM("NOT_STARTED", "IN_PROGRESS", "COMPLETED"),
      defaultValue: "NOT_STARTED",
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "merchants",
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ["merchantCode"],
        unique: true,
      },
      {
        fields: ["ownerId"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

export default Merchant;