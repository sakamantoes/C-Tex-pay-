// src/migrations/2024XXXXXX-create-permissions.js

import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("permissions", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    resource: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    action: {
      type: Sequelize.ENUM(
        "read",
        "create",
        "update",
        "delete",
        "manage",
        "revoke",
        "refund"
      ),
      allowNull: false,
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

  await queryInterface.addIndex("permissions", ["key"], { unique: true });
  await queryInterface.addIndex("permissions", ["resource"]);
  await queryInterface.addIndex("permissions", ["action"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("permissions");
}