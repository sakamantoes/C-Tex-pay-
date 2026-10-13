export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("payment_links", {
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
    title: { type: Sequelize.STRING(120), allowNull: false },
    description: { type: Sequelize.STRING(500), allowNull: true },
    slug: { type: Sequelize.STRING(32), allowNull: false, unique: true },
    amountType: {
      type: Sequelize.ENUM("FIXED", "CUSTOM"),
      allowNull: false,
      defaultValue: "FIXED",
    },
    amount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    currency: {
      type: Sequelize.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    paymentMethod: {
      type: Sequelize.ENUM("ACCOUNT_TRANSFER"),
      allowNull: false,
      defaultValue: "ACCOUNT_TRANSFER",
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "INACTIVE", "ARCHIVED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    allowMultiplePayments: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    expiresAt: { type: Sequelize.DATE, allowNull: true },
    consumedAt: { type: Sequelize.DATE, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex("payment_links", ["slug"], { unique: true });
  await queryInterface.addIndex("payment_links", ["merchantId", "status"]);
  await queryInterface.addIndex("payment_links", ["merchantId", "createdAt"]);
  await queryInterface.addIndex("payment_links", ["status"]);

  await queryInterface.addColumn("payments", "paymentLinkId", {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: "payment_links", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await queryInterface.addIndex("payments", ["paymentLinkId"]);
}

export async function down(queryInterface) {
  await queryInterface.removeIndex("payments", ["paymentLinkId"]);
  await queryInterface.removeColumn("payments", "paymentLinkId");
  await queryInterface.dropTable("payment_links");
}