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
        notEmpty: {
          msg: "First name is required",
        },
        len: {
          args: [2, 100],
          msg: "First name must be between 2 and 100 characters",
        },
      },
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "last_name",

      validate: {
        notEmpty: {
          msg: "Last name is required",
        },
        len: {
          args: [2, 100],
          msg: "Last name must be between 2 and 100 characters",
        },
      },
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,

      set(value) {
        this.setDataValue(
          "email",
          value ? value.trim().toLowerCase() : value
        );
      },

      validate: {
        notEmpty: {
          msg: "Email is required",
        },
        isEmail: {
          msg: "Please provide a valid email address",
        },
      },
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,

      set(value) {
        this.setDataValue(
          "phone",
          value ? value.trim() : value
        );
      },
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false,

      validate: {
        notEmpty: {
          msg: "Password is required",
        },
      },
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
        name: "users_email_unique",
        fields: ["email"],
      },

      {
        unique: true,
        name: "users_phone_unique",
        fields: ["phone"],
      },

      {
        name: "users_status_index",
        fields: ["status"],
      },

      {
        name: "users_role_index",
        fields: ["role"],
      },
    ],
  }
);

export default User;

