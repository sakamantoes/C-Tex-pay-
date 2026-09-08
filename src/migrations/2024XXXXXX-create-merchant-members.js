// src/migrations/2024XXXXXX-create-merchant-members.js

import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("merchant_members", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "merchants",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "INVITED", "SUSPENDED", "REMOVED"),
      defaultValue: "ACTIVE",
      allowNull: false,
    },
    joinedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
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

  await queryInterface.addIndex("merchant_members", ["merchantId", "userId"], {
    unique: true,
  });
  await queryInterface.addIndex("merchant_members", ["merchantId"]);
  await queryInterface.addIndex("merchant_members", ["userId"]);
  await queryInterface.addIndex("merchant_members", ["status"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("merchant_members");
}