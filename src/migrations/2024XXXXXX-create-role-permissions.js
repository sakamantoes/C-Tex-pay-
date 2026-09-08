// src/migrations/2024XXXXXX-create-role-permissions.js

import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("role_permissions", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    roleId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "roles",
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

  await queryInterface.addIndex("role_permissions", ["roleId", "permissionId"], {
    unique: true,
  });
  await queryInterface.addIndex("role_permissions", ["roleId"]);
  await queryInterface.addIndex("role_permissions", ["permissionId"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("role_permissions");
}