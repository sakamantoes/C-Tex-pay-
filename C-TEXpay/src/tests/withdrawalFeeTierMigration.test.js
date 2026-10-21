import test from "node:test";
import assert from "node:assert/strict";
import { up } from "../migrations/20261022-ensure-withdrawal-fee-tiers.js";

function makeQueryInterface(initialRows = [], tableInitiallyExists = false) {
  const operations = [];
  let exists = tableInitiallyExists;
  let rows = initialRows.map((row) => ({ ...row }));
  let indexes = [];
  const columns = Object.fromEntries([
    "id", "tierKey", "minimumAmount", "maximumAmountExclusive", "feeAmount",
    "version", "updatedBy", "createdAt", "updatedAt",
  ].map((name) => [name, {}]));
  const queryInterface = {
    operations,
    showAllTables: async () => exists ? ["withdrawal_fee_tiers"] : [],
    createTable: async (table, definition) => {
      operations.push({ type: "createTable", table, definition });
      exists = true;
    },
    describeTable: async () => ({ ...columns }),
    showIndex: async () => [...indexes],
    addIndex: async (table, fields, options) => {
      operations.push({ type: "addIndex", table, fields, options });
      indexes.push({ name: options.name });
    },
    bulkInsert: async (table, values) => {
      operations.push({ type: "bulkInsert", table, values });
      rows = [...rows, ...values];
    },
    sequelize: {
      query: async (_sql, options) => {
        assert.equal(options.type, "SELECT");
        return rows.map((row) => ({ ...row }));
      },
    },
  };
  return queryInterface;
}

function sequelizeTypes() {
  const type = (name) => (...args) => ({ name, args });
  const bigint = { name: "BIGINT" };
  bigint.UNSIGNED = { name: "BIGINT.UNSIGNED" };
  const integer = { name: "INTEGER" };
  integer.UNSIGNED = { name: "INTEGER.UNSIGNED" };
  return {
    UUID: { name: "UUID" },
    STRING: type("STRING"),
    BIGINT: bigint,
    INTEGER: integer,
    DATE: { name: "DATE" },
    QueryTypes: { SELECT: "SELECT" },
  };
}

const configuredRows = [
  { tierKey: "UNDER_10000", minimumAmount: 1, maximumAmountExclusive: 1_000_000, feeAmount: 2_500 },
  { tierKey: "FROM_10000_TO_50000", minimumAmount: 1_000_000, maximumAmountExclusive: 5_000_000, feeAmount: 4_000 },
  { tierKey: "FROM_50000", minimumAmount: 5_000_000, maximumAmountExclusive: null, feeAmount: 8_000 },
];

test("withdrawal tier migration creates and seeds all default ranges when absent", async () => {
  const queryInterface = makeQueryInterface();
  await up(queryInterface, sequelizeTypes());
  assert.equal(queryInterface.operations.filter((operation) => operation.type === "createTable").length, 1);
  const inserted = queryInterface.operations.find((operation) => operation.type === "bulkInsert");
  assert.equal(inserted.values.length, 3);
  assert.equal(inserted.values[0].feeAmount, 2_000);
});

test("withdrawal tier migration fills missing tiers and preserves configured fees on reruns", async () => {
  const queryInterface = makeQueryInterface(configuredRows.slice(0, 2), true);
  await up(queryInterface, sequelizeTypes());
  const insert = queryInterface.operations.find((operation) => operation.type === "bulkInsert");
  assert.equal(insert.values.length, 1);
  assert.equal(insert.values[0].tierKey, "FROM_50000");
  assert.equal(configuredRows[0].feeAmount, 2_500);

  const firstInsertCount = queryInterface.operations.filter((operation) => operation.type === "bulkInsert").length;
  await up(queryInterface, sequelizeTypes());
  assert.equal(queryInterface.operations.filter((operation) => operation.type === "bulkInsert").length, firstInsertCount);
});

test("withdrawal tier migration refuses changed fixed ranges without altering tier data", async () => {
  const invalid = [{ ...configuredRows[0], maximumAmountExclusive: 900_000 }];
  const queryInterface = makeQueryInterface(invalid, true);
  await assert.rejects(up(queryInterface, sequelizeTypes()), /unexpected amount range/);
  assert.equal(queryInterface.operations.some((operation) => operation.type === "bulkInsert"), false);
});
