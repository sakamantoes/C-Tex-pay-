import { randomUUID } from "node:crypto";

export async function up(queryInterface, Sequelize) {
  const feeColumns = await queryInterface.describeTable("fee_records");
  const columns = {
    provider: { type: Sequelize.STRING(50), allowNull: true },
    providerReference: { type: Sequelize.STRING(255), allowNull: true },
    providerFeeRateBps: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
    providerFeeEstimate: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    providerReportedFee: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    ctexFeeRateBps: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
    expectedSettlementAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    providerReportedSettlementAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    actualSettlementAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    estimatedCtexGrossMargin: { type: Sequelize.BIGINT, allowNull: true },
    ctexGrossMargin: { type: Sequelize.BIGINT, allowNull: true },
    financialStatus: {
      type: Sequelize.ENUM("NOT_RECOGNIZED", "RECOGNIZED", "ESTIMATED", "RECONCILED"),
      allowNull: false,
      defaultValue: "NOT_RECOGNIZED",
    },
    settlementStatus: {
      type: Sequelize.ENUM("PENDING", "REPORTED", "CONFIRMED", "DISCREPANCY", "UNAVAILABLE"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    paymentSuccessAt: { type: Sequelize.DATE, allowNull: true },
    settlementConfirmedAt: { type: Sequelize.DATE, allowNull: true },
    reconciliationDifference: { type: Sequelize.BIGINT, allowNull: true },
  };
  for (const [name, definition] of Object.entries(columns)) {
    if (!feeColumns[name]) await queryInterface.addColumn("fee_records", name, definition);
  }
  const feeIndexes = await queryInterface.showIndex("fee_records");
  if (!feeIndexes.some((index) => index.name === "fee_records_financial_status_idx")) {
    await queryInterface.addIndex("fee_records", ["financialStatus", "paymentSuccessAt"], { name: "fee_records_financial_status_idx" });
  }
  if (!feeIndexes.some((index) => index.name === "fee_records_settlement_status_idx")) {
    await queryInterface.addIndex("fee_records", ["settlementStatus", "paymentSuccessAt"], { name: "fee_records_settlement_status_idx" });
  }

  const payoutColumns = await queryInterface.describeTable("payouts");
  if (!payoutColumns.providerFeeReported) {
    await queryInterface.addColumn("payouts", "providerFeeReported", { type: Sequelize.BIGINT.UNSIGNED, allowNull: true });
  }

  const tables = await queryInterface.showAllTables();
  if (!tables.map(String).includes("withdrawal_fee_tiers")) {
    await queryInterface.createTable("withdrawal_fee_tiers", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tierKey: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      minimumAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      maximumAmountExclusive: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      feeAmount: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  }
  const tierIndexes = await queryInterface.showIndex("withdrawal_fee_tiers");
  if (!tierIndexes.some((index) => index.name === "withdrawal_fee_tier_range_idx")) {
    await queryInterface.addIndex("withdrawal_fee_tiers", ["minimumAmount", "maximumAmountExclusive"], { name: "withdrawal_fee_tier_range_idx" });
  }
  const defaultTiers = [
    { tierKey: "UNDER_10000", minimumAmount: 1, maximumAmountExclusive: 1_000_000, feeAmount: 2_000 },
    { tierKey: "FROM_10000_TO_50000", minimumAmount: 1_000_000, maximumAmountExclusive: 5_000_000, feeAmount: 4_000 },
    { tierKey: "FROM_50000", minimumAmount: 5_000_000, maximumAmountExclusive: null, feeAmount: 8_000 },
  ];
  const currentTiers = await queryInterface.sequelize.query("SELECT tierKey FROM withdrawal_fee_tiers", { type: Sequelize.QueryTypes.SELECT });
  const existingKeys = new Set(currentTiers.map((row) => row.tierKey));
  const now = new Date();
  const missingTiers = defaultTiers.filter(({ tierKey }) => !existingKeys.has(tierKey)).map((tier) => ({ id: randomUUID(), ...tier, version: 1, createdAt: now, updatedAt: now }));
  if (missingTiers.length) await queryInterface.bulkInsert("withdrawal_fee_tiers", missingTiers);

  // Current SUCCESS is the existing authoritative state. Use the first
  // success-history timestamp when available; otherwise leave the timestamp
  // null rather than inventing one. Historical provider fees and settlements
  // are unknown, so preserve the fee snapshot and mark settlement unavailable.
  await queryInterface.sequelize.query(`
    UPDATE fee_records fr
    INNER JOIN payments p ON p.id = fr.paymentId AND p.status = 'SUCCESS'
    LEFT JOIN (
      SELECT paymentId, MIN(createdAt) AS successAt
      FROM payment_status_history
      WHERE newStatus = 'SUCCESS'
      GROUP BY paymentId
    ) history ON history.paymentId = p.id
    SET fr.provider = p.provider,
        fr.providerReference = p.providerReference,
        fr.paymentSuccessAt = history.successAt,
        fr.financialStatus = 'RECOGNIZED',
        fr.settlementStatus = 'UNAVAILABLE'
    WHERE fr.financialStatus = 'NOT_RECOGNIZED'
  `);
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  if (tables.map(String).includes("withdrawal_fee_tiers")) await queryInterface.dropTable("withdrawal_fee_tiers");
  const payoutColumns = await queryInterface.describeTable("payouts");
  if (payoutColumns.providerFeeReported) await queryInterface.removeColumn("payouts", "providerFeeReported");
  const columns = await queryInterface.describeTable("fee_records");
  const indexes = await queryInterface.showIndex("fee_records");
  for (const name of ["fee_records_settlement_status_idx", "fee_records_financial_status_idx"]) {
    if (indexes.some((index) => index.name === name)) await queryInterface.removeIndex("fee_records", name);
  }
  for (const name of [
    "reconciliationDifference", "settlementConfirmedAt", "paymentSuccessAt", "settlementStatus",
    "financialStatus", "ctexGrossMargin", "estimatedCtexGrossMargin", "actualSettlementAmount",
    "providerReportedSettlementAmount", "expectedSettlementAmount", "ctexFeeRateBps", "providerReportedFee",
    "providerFeeEstimate", "providerFeeRateBps", "providerReference", "provider",
  ]) if (columns[name]) await queryInterface.removeColumn("fee_records", name);
}
