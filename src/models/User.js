import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "first_name",
      validate: {
        notEmpty: true,
      },
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "last_name",
      validate: {
        notEmpty: true,
      },
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM(
        "USER",
        "MERCHANT",
        "ADMIN",
        "SUPER_ADMIN"
      ),
      allowNull: false,
      defaultValue: "USER",
    },

    status: {
      type: DataTypes.ENUM(
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
        "PENDING"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },

    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "email_verified",
    },

    phoneVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "phone_verified",
    },

    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login_at",
    },

    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "password_changed_at",
    },

    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "failed_login_attempts",
    },

    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "locked_until",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        unique: true,
        fields: ["phone"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["role"],
      },
    ],
  }
);

module.exports = User;

