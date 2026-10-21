const REQUIRED_BASE_COLUMNS = [
  "id",
  "paymentId",
  "merchantId",
  "feeConfigurationId",
  "currency",
  "grossAmount",
  "serviceFee",
  "providerFee",
  "totalFee",
  "merchantNetAmount",
  "providerFeeTreatment",
  "feeBreakdown",
  "calculationVersion",
  "createdAt",
];

const FINANCIAL_COLUMNS = {
  provider: { type: (Sequelize) => Sequelize.STRING(50), allowNull: true },
  providerReference: { type: (Sequelize) => Sequelize.STRING(255), allowNull: true },
  providerFeeRateBps: { type: (Sequelize) => Sequelize.INTEGER.UNSIGNED, allowNull: true },
  providerFeeEstimate: { type: (Sequelize) => Sequelize.BIGINT.UNSIGNED, allowNull: true },
  providerReportedFee: { type: (Sequelize) => Sequelize.BIGINT.UNSIGNED, allowNull: true },
  ctexFeeRateBps: { type: (Sequelize) => Sequelize.INTEGER.UNSIGNED, allowNull: true },
  expectedSettlementAmount: { type: (Sequelize) => Sequelize.BIGINT.UNSIGNED, allowNull: true },
  providerReportedSettlementAmount: { type: (Sequelize) => Sequelize.BIGINT.UNSIGNED, allowNull: true },
  actualSettlementAmount: { type: (Sequelize) => Sequelize.BIGINT.UNSIGNED, allowNull: true },
  estimatedCtexGrossMargin: { type: (Sequelize) => Sequelize.BIGINT, allowNull: true },
  ctexGrossMargin: { type: (Sequelize) => Sequelize.BIGINT, allowNull: true },
  financialStatus: {
    type: (Sequelize) => Sequelize.ENUM("NOT_RECOGNIZED", "RECOGNIZED", "ESTIMATED", "RECONCILED"),
    allowNull: false,
    defaultValue: "NOT_RECOGNIZED",
  },
  settlementStatus: {
    type: (Sequelize) => Sequelize.ENUM("PENDING", "REPORTED", "CONFIRMED", "DISCREPANCY", "UNAVAILABLE"),
    allowNull: false,
    // Existing rows have no reconstructible settlement state. Add them as
    // UNAVAILABLE; the column default is changed to PENDING below for new rows.
    defaultValue: "UNAVAILABLE",
  },
  paymentSuccessAt: { type: (Sequelize) => Sequelize.DATE, allowNull: true },
  settlementConfirmedAt: { type: (Sequelize) => Sequelize.DATE, allowNull: true },
  reconciliationDifference: { type: (Sequelize) => Sequelize.BIGINT, allowNull: true },
};

/**
 * Forward-only additive migration for the fee-record financial snapshot.
 * MariaDB commits DDL statements independently, so each operation is guarded
 * and the migration can safely resume after a partial deployment.
 */
export async function up(queryInterface, Sequelize) {
  const columns = await queryInterface.describeTable("fee_records");
  const missingBaseColumns = REQUIRED_BASE_COLUMNS.filter((name) => !columns[name]);
  if (missingBaseColumns.length) {
    throw new Error(`fee_records is missing expected base columns: ${missingBaseColumns.join(", ")}`);
  }

  for (const [name, definition] of Object.entries(FINANCIAL_COLUMNS)) {
    if (!columns[name]) {
      const { type, ...options } = definition;
      await queryInterface.addColumn("fee_records", name, {
        ...options,
        type: type(Sequelize),
      });
    }
  }

  // Keep the final database default aligned with the model while preserving
  // UNAVAILABLE on historical rows populated during the additive column step.
  await queryInterface.changeColumn("fee_records", "settlementStatus", {
    type: FINANCIAL_COLUMNS.settlementStatus.type(Sequelize),
    allowNull: false,
    defaultValue: "PENDING",
  });

  const indexes = await queryInterface.showIndex("fee_records");
  const indexDefinitions = [
    {
      name: "fee_records_financial_status_idx",
      fields: ["financialStatus", "paymentSuccessAt"],
    },
    {
      name: "fee_records_settlement_status_idx",
      fields: ["settlementStatus", "paymentSuccessAt"],
    },
  ];
  for (const index of indexDefinitions) {
    if (!indexes.some((existing) => existing.name === index.name)) {
      await queryInterface.addIndex("fee_records", index.fields, { name: index.name });
    }
  }

  // Provider is known from the related Payment record; leave it null if that
  // authoritative value is absent. No estimates or settlements are inferred.
  const paymentColumns = await queryInterface.describeTable("payments");
  if (paymentColumns.provider) {
    await queryInterface.sequelize.query(`
      UPDATE fee_records fr
      INNER JOIN payments p ON p.id = fr.paymentId
      SET fr.provider = p.provider
      WHERE fr.provider IS NULL AND p.provider IS NOT NULL
    `);
  }
}
