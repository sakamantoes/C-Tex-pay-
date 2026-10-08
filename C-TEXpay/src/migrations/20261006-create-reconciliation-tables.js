export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("reconciliation_runs", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    provider: { type: Sequelize.STRING(50), allowNull: false },
    reconciliationType: {
      type: Sequelize.ENUM("PAYMENTS", "PAYOUTS", "FULL"),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("PENDING", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    periodStart: { type: Sequelize.DATE, allowNull: false },
    periodEnd: { type: Sequelize.DATE, allowNull: false },
    startedAt: { type: Sequelize.DATE, allowNull: true },
    completedAt: { type: Sequelize.DATE, allowNull: true },
    totalRecords: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    matchedRecords: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    mismatchedRecords: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    missingInternalRecords: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    missingProviderRecords: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    amountMismatches: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    statusMismatches: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    errorCount: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    triggeredBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    metadata: { type: Sequelize.JSON, allowNull: true },
    lastError: { type: Sequelize.STRING(1000), allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex("reconciliation_runs", ["provider", "status"]);
  await queryInterface.addIndex("reconciliation_runs", ["reconciliationType"]);
  await queryInterface.addIndex("reconciliation_runs", ["periodStart", "periodEnd"]);
  await queryInterface.addIndex("reconciliation_runs", ["merchantId"]);
  await queryInterface.addIndex("reconciliation_runs", ["createdAt"]);

  await queryInterface.createTable("reconciliation_discrepancies", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    reconciliationId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "reconciliation_runs", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    provider: { type: Sequelize.STRING(50), allowNull: false },
    type: {
      type: Sequelize.ENUM(
        "MISSING_PROVIDER_RECORD",
        "MISSING_INTERNAL_RECORD",
        "STATUS_MISMATCH",
        "AMOUNT_MISMATCH",
        "CURRENCY_MISMATCH",
        "DUPLICATE_PROVIDER_RECORD",
        "DUPLICATE_INTERNAL_RECORD",
        "REFERENCE_MISMATCH",
        "UNKNOWN_PROVIDER_TRANSACTION"
      ),
      allowNull: false,
    },
    severity: {
      type: Sequelize.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
      allowNull: false,
      defaultValue: "MEDIUM",
    },
    paymentId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "payments", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    payoutId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "payouts", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    internalReference: { type: Sequelize.STRING(255), allowNull: true },
    providerReference: { type: Sequelize.STRING(255), allowNull: true },
    internalStatus: { type: Sequelize.STRING(50), allowNull: true },
    providerStatus: { type: Sequelize.STRING(50), allowNull: true },
    internalAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    providerAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    currency: { type: Sequelize.STRING(10), allowNull: true },
    status: {
      type: Sequelize.ENUM("OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"),
      allowNull: false,
      defaultValue: "OPEN",
    },
    reason: { type: Sequelize.STRING(500), allowNull: true },
    metadata: { type: Sequelize.JSON, allowNull: true },
    resolvedAt: { type: Sequelize.DATE, allowNull: true },
    resolvedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    resolutionNote: { type: Sequelize.STRING(1000), allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "reconciliation_discrepancies",
    ["reconciliationId", "providerReference", "type"],
    { name: "recon_disc_unique_open" }
  );
  await queryInterface.addIndex("reconciliation_discrepancies", ["reconciliationId"]);
  await queryInterface.addIndex("reconciliation_discrepancies", ["merchantId"]);
  await queryInterface.addIndex("reconciliation_discrepancies", ["status"]);
  await queryInterface.addIndex("reconciliation_discrepancies", ["severity"]);
  await queryInterface.addIndex("reconciliation_discrepancies", ["type"]);
  await queryInterface.addIndex("reconciliation_discrepancies", ["paymentId"]);
  await queryInterface.addIndex("reconciliation_discrepancies", ["payoutId"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("reconciliation_discrepancies");
  await queryInterface.dropTable("reconciliation_runs");
}