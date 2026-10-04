// src/migrations/2024XXXXXX-create-merchant-member-roles.js

import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("merchant_member_roles", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    merchantMemberId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "merchant_members",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
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
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    "merchant_member_roles",
    ["merchantMemberId", "roleId"],
    {
      unique: true,
    }
  );
  await queryInterface.addIndex("merchant_member_roles", ["merchantMemberId"]);
  await queryInterface.addIndex("merchant_member_roles", ["roleId"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("merchant_member_roles");
}