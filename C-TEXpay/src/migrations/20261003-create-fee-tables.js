export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("fee_configurations", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: { type: Sequelize.STRING(100), allowNull: false },
    description: { type: Sequelize.STRING(500), allowNull: true },
    currency: {
      type: Sequelize.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    paymentMethod: {
      type: Sequelize.ENUM("ACCOUNT_TRANSFER"),
      allowNull: true,
    },
    feeType: {
      type: Sequelize.ENUM("PERCENTAGE", "FIXED", "PERCENTAGE_PLUS_FIXED"),
      allowNull: false,
    },
    percentageRateBps: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    fixedAmount: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    minimumFee: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    maximumFee: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    },
    providerFeeTreatment: {
      type: Sequelize.ENUM("ABSORBED", "PASSED_TO_MERCHANT", "UNKNOWN"),
      allowNull: false,
      defaultValue: "UNKNOWN",
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    effectiveFrom: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    effectiveUntil: { type: Sequelize.DATE, allowNull: true },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    updatedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex("fee_configurations", ["merchantId", "status"]);
  await queryInterface.addIndex("fee_configurations", ["currency", "status"]);
  await queryInterface.addIndex("fee_configurations", ["effectiveFrom", "effectiveUntil"]);

  await queryInterface.createTable("fee_records", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    paymentId: {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      references: { model: "payments", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    feeConfigurationId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "fee_configurations", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    currency: {
      type: Sequelize.ENUM("NGN"),
      allowNull: false,
    },
    grossAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
    serviceFee: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
    providerFee: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    totalFee: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
    merchantNetAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
    providerFeeTreatment: {
      type: Sequelize.ENUM("ABSORBED", "PASSED_TO_MERCHANT", "UNKNOWN"),
      allowNull: false,
      defaultValue: "UNKNOWN",
    },
    feeBreakdown: { type: Sequelize.JSON, allowNull: true },
    calculationVersion: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "v1",
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex("fee_records", ["paymentId"], { unique: true });
  await queryInterface.addIndex("fee_records", ["merchantId"]);
  await queryInterface.addIndex("fee_records", ["feeConfigurationId"]);
  await queryInterface.addIndex("fee_records", ["createdAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("fee_records");
  await queryInterface.dropTable("fee_configurations");
}