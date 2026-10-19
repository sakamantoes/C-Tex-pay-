import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AdminAuditLog = sequelize.define("AdminAuditLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actorUserId: { type: DataTypes.UUID, allowNull: false },
  action: { type: DataTypes.STRING(100), allowNull: false },
  resourceType: { type: DataTypes.STRING(100), allowNull: false },
  resourceId: { type: DataTypes.STRING(100), allowNull: false },
  outcome: { type: DataTypes.ENUM("SUCCESS", "FAILURE"), allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: true },
  beforeValue: { type: DataTypes.JSON, allowNull: true },
  afterValue: { type: DataTypes.JSON, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: "admin_audit_logs",
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ["actorUserId", "createdAt"] },
    { fields: ["resourceType", "resourceId", "createdAt"] },
    { fields: ["action", "createdAt"] },
  ],
});

export default AdminAuditLog;
