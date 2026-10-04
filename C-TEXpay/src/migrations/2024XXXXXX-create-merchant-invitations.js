// src/migrations/2024XXXXXX-create-merchant-invitations.js

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("merchant_invitations", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    roleId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "roles", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    token: {
      type: Sequelize.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    acceptedAt: {
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

  await queryInterface.addIndex("merchant_invitations", ["merchantId", "email"]);
  await queryInterface.addIndex("merchant_invitations", ["expiresAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("merchant_invitations");
}
