import { encryptApiKeyValue } from "../service/apiKey.service.js";

export async function up(queryInterface, Sequelize) {
  const columns = await queryInterface.describeTable("payouts");
  if (String(columns.accountNumber?.type || "").toUpperCase() !== "VARCHAR(512)") {
    await queryInterface.changeColumn("payouts", "accountNumber", {
      type: Sequelize.STRING(512),
      allowNull: false,
    });
  }
  if (!columns.accountNumberLast4) {
    await queryInterface.addColumn("payouts", "accountNumberLast4", {
      type: Sequelize.STRING(4),
      allowNull: true,
    });
  }
  if (!columns.feeMode) {
    await queryInterface.addColumn("payouts", "feeMode", {
      type: Sequelize.ENUM("FEE_ON_TOP", "DEDUCT_FROM_AMOUNT"),
      allowNull: false,
      defaultValue: "FEE_ON_TOP",
    });
  }
  if (!columns.feeAmount) {
    await queryInterface.addColumn("payouts", "feeAmount", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!columns.walletDebitAmount) {
    await queryInterface.addColumn("payouts", "walletDebitAmount", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!columns.beneficiaryAmount) {
    await queryInterface.addColumn("payouts", "beneficiaryAmount", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!columns.feeConfigurationId) {
    await queryInterface.addColumn("payouts", "feeConfigurationId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "fee_configurations", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }
  if (!columns.feeSnapshot) {
    await queryInterface.addColumn("payouts", "feeSnapshot", {
      type: Sequelize.JSON,
      allowNull: true,
    });
  }
  await queryInterface.sequelize.query(
    "UPDATE payouts SET walletDebitAmount = amount, beneficiaryAmount = amount WHERE walletDebitAmount = 0 AND feeAmount = 0",
  );

  const rows = await queryInterface.sequelize.query(
    "SELECT id, accountNumber, accountNumberLast4 FROM payouts",
    { type: Sequelize.QueryTypes.SELECT },
  );
  for (const row of rows) {
    const raw = String(row.accountNumber || "");
    const last4 = row.accountNumberLast4 || raw.slice(-4);
    const stored = raw.startsWith("enc:v1:") ? raw : `enc:v1:${encryptApiKeyValue(raw)}`;
    await queryInterface.sequelize.query(
      "UPDATE payouts SET accountNumber = :accountNumber, accountNumberLast4 = :last4 WHERE id = :id",
      { replacements: { accountNumber: stored, last4, id: row.id } },
    );
  }
}

export async function down(queryInterface) {
  const columns = await queryInterface.describeTable("payouts");
  for (const name of [
    "feeSnapshot",
    "feeConfigurationId",
    "beneficiaryAmount",
    "walletDebitAmount",
    "feeAmount",
    "feeMode",
  ]) {
    if (columns[name]) await queryInterface.removeColumn("payouts", name);
  }
  // Encrypted account numbers are intentionally kept encrypted; reverting
  // this migration must not silently write beneficiary data back as plaintext.
}
