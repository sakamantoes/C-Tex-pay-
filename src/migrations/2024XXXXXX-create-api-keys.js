export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("api_keys", {
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
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    keyPrefix: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    keyHash: {
      type: Sequelize.STRING(64),
      allowNull: false,
      unique: true,
    },
    environment: {
      type: Sequelize.ENUM("TEST", "LIVE"),
      allowNull: false,
      defaultValue: "TEST",
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "REVOKED", "EXPIRED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    lastUsedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    revokedAt: {
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

  await queryInterface.addIndex("api_keys", ["keyHash"], { unique: true });
  await queryInterface.addIndex("api_keys", ["merchantId"]);
  await queryInterface.addIndex("api_keys", ["status"]);
  await queryInterface.addIndex("api_keys", ["environment"]);
  await queryInterface.addIndex("api_keys", ["expiresAt"]);
  await queryInterface.addIndex("api_keys", ["revokedAt"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("api_keys");
}