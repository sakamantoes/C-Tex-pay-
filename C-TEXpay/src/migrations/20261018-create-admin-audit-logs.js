export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("admin_audit_logs", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    actorUserId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    action: { type: Sequelize.STRING(100), allowNull: false },
    resourceType: { type: Sequelize.STRING(100), allowNull: false },
    resourceId: { type: Sequelize.STRING(100), allowNull: false },
    outcome: { type: Sequelize.ENUM("SUCCESS", "FAILURE"), allowNull: false },
    reason: { type: Sequelize.STRING(500), allowNull: true },
    beforeValue: { type: Sequelize.JSON, allowNull: true },
    afterValue: { type: Sequelize.JSON, allowNull: true },
    metadata: { type: Sequelize.JSON, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  });
  await queryInterface.addIndex("admin_audit_logs", ["actorUserId", "createdAt"]);
  await queryInterface.addIndex("admin_audit_logs", ["resourceType", "resourceId", "createdAt"]);
  await queryInterface.addIndex("admin_audit_logs", ["action", "createdAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("admin_audit_logs");
}
