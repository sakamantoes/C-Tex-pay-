import { randomUUID } from "node:crypto";

const TABLE = "withdrawal_fee_tiers";
const TIERS = [
  { tierKey: "UNDER_10000", minimumAmount: 1, maximumAmountExclusive: 1_000_000, feeAmount: 2_000 },
  { tierKey: "FROM_10000_TO_50000", minimumAmount: 1_000_000, maximumAmountExclusive: 5_000_000, feeAmount: 4_000 },
  { tierKey: "FROM_50000", minimumAmount: 5_000_000, maximumAmountExclusive: null, feeAmount: 8_000 },
];
const REQUIRED_COLUMNS = [
  "id", "tierKey", "minimumAmount", "maximumAmountExclusive", "feeAmount",
  "version", "updatedBy", "createdAt", "updatedAt",
];

function tableExists(tables) {
  return tables.some((table) => String(table).split(".").at(-1) === TABLE);
}

function assertFixedTierRanges(rows) {
  const expectedByKey = new Map(TIERS.map((tier) => [tier.tierKey, tier]));
  for (const row of rows) {
    const expected = expectedByKey.get(row.tierKey);
    if (!expected) {
      throw new Error(`Unexpected withdrawal fee tier key: ${row.tierKey}`);
    }
    const actualMaximum = row.maximumAmountExclusive == null ? null : Number(row.maximumAmountExclusive);
    if (
      Number(row.minimumAmount) !== expected.minimumAmount ||
      actualMaximum !== expected.maximumAmountExclusive
    ) {
      throw new Error(`Withdrawal fee tier ${row.tierKey} has an unexpected amount range; no existing data was changed`);
    }
  }
}

/**
 * Create the withdrawal fee table if absent and add only missing default tier
 * keys. Existing fee amounts and audit metadata are never overwritten.
 */
export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (!tableExists(tables)) {
    await queryInterface.createTable(TABLE, {
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

  const columns = await queryInterface.describeTable(TABLE);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns[column]);
  if (missingColumns.length) {
    throw new Error(`Cannot safely repair ${TABLE}; missing columns: ${missingColumns.join(", ")}`);
  }

  const indexes = await queryInterface.showIndex(TABLE);
  if (!indexes.some((index) => index.name === "withdrawal_fee_tier_range_idx")) {
    await queryInterface.addIndex(TABLE, ["minimumAmount", "maximumAmountExclusive"], {
      name: "withdrawal_fee_tier_range_idx",
    });
  }

  const existingRows = await queryInterface.sequelize.query(
    `SELECT tierKey, minimumAmount, maximumAmountExclusive, feeAmount, version, updatedBy, createdAt, updatedAt FROM ${TABLE}`,
    { type: Sequelize.QueryTypes.SELECT },
  );
  assertFixedTierRanges(existingRows);
  const existingKeys = new Set(existingRows.map((row) => row.tierKey));
  const now = new Date();
  const missingRows = TIERS
    .filter(({ tierKey }) => !existingKeys.has(tierKey))
    .map((tier) => ({ id: randomUUID(), ...tier, version: 1, updatedBy: null, createdAt: now, updatedAt: now }));

  if (missingRows.length) await queryInterface.bulkInsert(TABLE, missingRows);

  const finalRows = await queryInterface.sequelize.query(
    `SELECT tierKey, minimumAmount, maximumAmountExclusive, feeAmount FROM ${TABLE}`,
    { type: Sequelize.QueryTypes.SELECT },
  );
  assertFixedTierRanges(finalRows);
  const finalKeys = new Set(finalRows.map((row) => row.tierKey));
  if (finalRows.length !== TIERS.length || TIERS.some(({ tierKey }) => !finalKeys.has(tierKey))) {
    throw new Error(`Could not establish the complete ${TABLE} configuration`);
  }
}
