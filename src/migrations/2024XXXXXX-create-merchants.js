// src/migrations/2024XXXXXX-create-merchants.js

import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("merchants", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    ownerId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    merchantCode: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    onboardingStatus: {
      type: Sequelize.ENUM("NOT_STARTED", "IN_PROGRESS", "COMPLETED"),
      defaultValue: "NOT_STARTED",
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
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  await queryInterface.addIndex("merchants", ["merchantCode"], {
    unique: true,
  });
  await queryInterface.addIndex("merchants", ["ownerId"]);
  await queryInterface.addIndex("merchants", ["status"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("merchants");
}