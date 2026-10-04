export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("api_key_permissions", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    apiKeyId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "api_keys",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    permissionId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "permissions",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex("api_key_permissions", ["apiKeyId", "permissionId"], {
    unique: true,
  });
  await queryInterface.addIndex("api_key_permissions", ["apiKeyId"]);
  await queryInterface.addIndex("api_key_permissions", ["permissionId"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("api_key_permissions");
}