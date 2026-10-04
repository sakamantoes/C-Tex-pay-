// src/migrations/2024XXXXXX-create-business-profiles.js

import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("business_profiles", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: "merchants",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    businessName: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    businessType: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    phone: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    website: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    country: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    state: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    city: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    logoUrl: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
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

  await queryInterface.addIndex("business_profiles", ["merchantId"], {
    unique: true,
  });
  await queryInterface.addIndex("business_profiles", ["businessName"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("business_profiles");
}