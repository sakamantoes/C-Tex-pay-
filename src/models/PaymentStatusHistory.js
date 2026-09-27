import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const PaymentStatusHistory = sequelize.define(
  "PaymentStatusHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "payments",
        key: "id",
      },
    },
    previousStatus: {
      type: DataTypes.ENUM(
        "PENDING",
        "SUCCESS",
        "FAILED",
        "EXPIRED",
        "CANCELLED"
      ),
      allowNull: true,
    },
    newStatus: {
      type: DataTypes.ENUM(
        "PENDING",
        "SUCCESS",
        "FAILED",
        "EXPIRED",
        "CANCELLED"
      ),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM(
        "INITIALIZATION",
        "PROVIDER",
        "VERIFICATION",
        "WEBHOOK",
        "SYSTEM",
        "ADMIN"
      ),
      allowNull: false,
    },
  },
  {
    tableName: "payment_status_history",
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ["paymentId"],
      },
      {
        fields: ["paymentId", "createdAt"],
      },
      {
        fields: ["newStatus"],
      },
    ],
  }
);

export default PaymentStatusHistory;