export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("payouts", {
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
      onDelete: "RESTRICT",
    },
    amount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
    currency: {
      type: Sequelize.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    bankCode: { type: Sequelize.STRING(10), allowNull: false },
    accountNumber: { type: Sequelize.STRING(20), allowNull: false },
    accountName: { type: Sequelize.STRING(255), allowNull: false },
    narration: { type: Sequelize.STRING(500), allowNull: true },
    merchantReference: { type: Sequelize.STRING(255), allowNull: true },
    idempotencyKey: { type: Sequelize.STRING(255), allowNull: false },
    requestHash: { type: Sequelize.STRING(64), allowNull: false },
    provider: { type: Sequelize.STRING(50), allowNull: true },
    providerReference: { type: Sequelize.STRING(255), allowNull: true },
    providerStatus: { type: Sequelize.STRING(50), allowNull: true },
    providerMetadata: { type: Sequelize.JSON, allowNull: true },
    status: {
      type: Sequelize.ENUM(
        "PENDING",
        "PROCESSING",
        "SUCCESS",
        "FAILED",
        "REVERSED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    failureCode: { type: Sequelize.STRING(50), allowNull: true },
    failureReason: { type: Sequelize.STRING(500), allowNull: true },
    reserveLedgerTransactionId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "ledger_transactions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    settleLedgerTransactionId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "ledger_transactions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    initiatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    processingAt: { type: Sequelize.DATE, allowNull: true },
    completedAt: { type: Sequelize.DATE, allowNull: true },
    failedAt: { type: Sequelize.DATE, allowNull: true },
    reversedAt: { type: Sequelize.DATE, allowNull: true },
    metadata: { type: Sequelize.JSON, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex("payouts", ["merchantId", "idempotencyKey"], {
    unique: true,
    name: "payouts_merchant_idempotency_unique",
  });
  await queryInterface.addIndex("payouts", ["merchantId", "createdAt"]);
  await queryInterface.addIndex("payouts", ["status"]);
  await queryInterface.addIndex("payouts", ["providerReference"]);
  await queryInterface.addIndex("payouts", ["initiatedAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("payouts");
}