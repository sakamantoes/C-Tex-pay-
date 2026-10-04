import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const CustomerMetadata = sequelize.define(
  "CustomerMetadata",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: "customers",
        key: "id",
      },
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
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
    tableName: "customer_metadata",
    timestamps: true,
  }
);

export default CustomerMetadata;
