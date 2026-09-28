import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Payment = sequelize.define(
  "Payment",
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
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "customers",
        key: "id",
      },
    },
    paymentReference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    merchantReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    amount: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment:
        "Amount in smallest currency unit (kobo for NGN). 25000 = NGN 250.00",
      validate: {
        min: 1,
      },
    },
    currency: {
      type: DataTypes.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    paymentMethod: {
      type: DataTypes.ENUM("ACCOUNT_TRANSFER"),
      allowNull: false,
      defaultValue: "ACCOUNT_TRANSFER",
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "SUCCESS",
        "FAILED",
        "EXPIRED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
      paymentInstructions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Transfer instructions for ACCOUNT_TRANSFER payments",
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    requestHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: "SHA-256 of canonical request payload for idempotency conflict detection",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment:
        "Populated in Stage 7 by provider integration. Nullable at initialization.",
    },
    // Internal provider fields (not exposed via merchant API).
    provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    providerReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    providerStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    providerMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ["paymentReference"],
        unique: true,
      },
      {
        fields: ["merchantId", "idempotencyKey"],
        unique: true,
        name: "payments_merchant_idempotency_unique",
      },
      {
        fields: ["merchantId", "paymentReference"],
        name: "payments_merchant_reference_idx",
      },
      {
        fields: ["merchantId", "merchantReference"],
        name: "payments_merchant_merchant_ref_idx",
      },
      {
        fields: ["merchantId", "status"],
        name: "payments_merchant_status_idx",
      },
      {
        fields: ["merchantId", "customerId"],
        name: "payments_merchant_customer_idx",
      },
      {
        fields: ["merchantId", "createdAt"],
        name: "payments_merchant_created_idx",
      },
      {
        fields: ["status"],
      },
    ],
  }
);

export default Payment;