import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const WithdrawalFeeTier = sequelize.define("WithdrawalFeeTier", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tierKey: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  minimumAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  maximumAmountExclusive: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  feeAmount: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: "withdrawal_fee_tiers",
  timestamps: true,
  indexes: [{ fields: ["minimumAmount", "maximumAmountExclusive"] }],
});

export default WithdrawalFeeTier;
