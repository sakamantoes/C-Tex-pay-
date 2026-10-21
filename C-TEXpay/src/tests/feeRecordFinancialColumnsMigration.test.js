import test from "node:test";
import assert from "node:assert/strict";
import { up } from "../migrations/20261021-add-fee-record-financial-columns.js";

function makeSequelizeTypes() {
  const type = (name) => (...args) => ({ name, args });
  const integer = type("INTEGER");
  integer.UNSIGNED = { name: "INTEGER.UNSIGNED" };
  const bigint = { name: "BIGINT" };
  bigint.UNSIGNED = { name: "BIGINT.UNSIGNED" };
  return {
    STRING: type("STRING"),
    INTEGER: integer,
    BIGINT: bigint,
    ENUM: (...values) => ({ name: "ENUM", values }),
    DATE: { name: "DATE" },
  };
}

function makeQueryInterface() {
  const operations = [];
  const feeColumns = Object.fromEntries([
    "id", "paymentId", "merchantId", "feeConfigurationId", "currency",
    "grossAmount", "serviceFee", "providerFee", "totalFee", "merchantNetAmount",
    "providerFeeTreatment", "feeBreakdown", "calculationVersion", "createdAt",
  ].map((name) => [name, {}]));
  const indexes = [];
  return {
    operations,
    sequelize: { query: async (sql) => operations.push({ operation: "query", sql }) },
    describeTable: async (table) => table === "fee_records" ? feeColumns : { provider: {} },
    addColumn: async (table, name, definition) => {
      operations.push({ operation: "addColumn", table, name, definition });
      feeColumns[name] = { type: definition.type, allowNull: definition.allowNull };
    },
    changeColumn: async (table, name, definition) => {
      operations.push({ operation: "changeColumn", table, name, definition });
      feeColumns[name] = { ...feeColumns[name], ...definition };
    },
    showIndex: async () => [...indexes],
    addIndex: async (table, fields, options) => {
      operations.push({ operation: "addIndex", table, fields, options });
      indexes.push({ name: options.name });
    },
  };
}

test("fee-record migration adds all missing financial columns with model-compatible definitions", async () => {
  const queryInterface = makeQueryInterface();
  await up(queryInterface, makeSequelizeTypes());

  const added = queryInterface.operations.filter((item) => item.operation === "addColumn");
  assert.equal(added.length, 16);
  const byName = Object.fromEntries(added.map((item) => [item.name, item.definition]));
  assert.equal(byName.provider.type.name, "STRING");
  assert.deepEqual(byName.provider.type.args, [50]);
  assert.equal(byName.providerFeeEstimate.type.name, "BIGINT.UNSIGNED");
  assert.equal(byName.estimatedCtexGrossMargin.type.name, "BIGINT");
  assert.equal(byName.financialStatus.defaultValue, "NOT_RECOGNIZED");
  assert.deepEqual(byName.financialStatus.type.values, ["NOT_RECOGNIZED", "RECOGNIZED", "ESTIMATED", "RECONCILED"]);
  assert.equal(byName.settlementStatus.defaultValue, "UNAVAILABLE");
  const settlementDefault = queryInterface.operations.find((item) => item.operation === "changeColumn");
  assert.equal(settlementDefault.definition.defaultValue, "PENDING");
  assert.equal(byName.paymentSuccessAt.allowNull, true);
  assert.equal(queryInterface.operations.filter((item) => item.operation === "addIndex").length, 2);

  const providerBackfill = queryInterface.operations.find((item) => item.operation === "query");
  assert.match(providerBackfill.sql, /p\.provider IS NOT NULL/);
  assert.match(providerBackfill.sql, /fr\.provider IS NULL/);
});

test("fee-record migration safely resumes after all columns and indexes exist", async () => {
  const queryInterface = makeQueryInterface();
  await up(queryInterface, makeSequelizeTypes());
  const firstRunAdds = queryInterface.operations.filter((item) => ["addColumn", "addIndex"].includes(item.operation)).length;
  await up(queryInterface, makeSequelizeTypes());
  const repeatedAdds = queryInterface.operations.filter((item) => ["addColumn", "addIndex"].includes(item.operation)).length - firstRunAdds;
  assert.equal(repeatedAdds, 0);
});

test("fee-record migration aborts when the confirmed base schema does not match", async () => {
  const queryInterface = makeQueryInterface();
  queryInterface.describeTable = async () => ({ id: {} });
  await assert.rejects(up(queryInterface, makeSequelizeTypes()), /missing expected base columns/);
  assert.equal(queryInterface.operations.length, 0);
});
