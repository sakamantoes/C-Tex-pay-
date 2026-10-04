// src/migrations/2024XXXXXX-create-notifications.js

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("notifications", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    type: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    data: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    readAt: {
      type: Sequelize.DATE,
      allowNull: true,
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

  await queryInterface.addIndex("notifications", ["userId", "readAt"]);
  await queryInterface.addIndex("notifications", ["userId", "createdAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("notifications");
}