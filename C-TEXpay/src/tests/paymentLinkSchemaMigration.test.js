import test from "node:test";
import assert from "node:assert/strict";
import { up as repairPaymentLinkPaymentReference } from "../migrations/20261020-repair-payment-link-payment-reference.js";

function makeQueryInterface({ paymentLinkIdType = "CHAR(36)" } = {}) {
  const operations = [];
  const columns = {
    payment_links: { id: { type: paymentLinkIdType, allowNull: false } },
    payments: {},
  };
  const indexes = [];
  const foreignKeys = [];

  return {
    operations,
    showAllTables: async () => ["payment_links", "payments"],
    describeTable: async (table) => ({ ...columns[table] }),
    addColumn: async (table, column, definition) => {
      operations.push({ operation: "addColumn", table, column, definition });
      columns[table][column] = { type: "CHAR(36)", allowNull: definition.allowNull };
    },
    getForeignKeyReferencesForTable: async () => [...foreignKeys],
    showIndex: async () => [...indexes],
    addIndex: async (table, fields, options) => {
      operations.push({ operation: "addIndex", table, fields, options });
      indexes.push({ name: options.name, fields: fields.map((attribute) => ({ attribute })) });
    },
    addConstraint: async (table, options) => {
      operations.push({ operation: "addConstraint", table, options });
      foreignKeys.push({
        columnName: options.fields[0],
        referencedTableName: options.references.table,
        referencedColumnName: options.references.field,
        constraintName: options.name,
      });
    },
  };
}

test("payment link schema migration adds a nullable UUID reference before indexing", async () => {
  const queryInterface = makeQueryInterface();
  class Sequelize { static UUID = "UUID"; }

  await repairPaymentLinkPaymentReference(queryInterface, Sequelize);

  assert.deepEqual(queryInterface.operations.map(({ operation }) => operation), ["addColumn", "addIndex", "addConstraint"]);
  const [column, index, constraint] = queryInterface.operations;
  assert.equal(column.column, "paymentLinkId");
  assert.equal(column.definition.allowNull, true);
  assert.equal(index.options.name, "payments_payment_link_id");
  assert.equal(constraint.options.references.table, "payment_links");
  assert.equal(constraint.options.references.field, "id");
  assert.equal(constraint.options.onDelete, "SET NULL");
});

test("payment link schema migration is safe to rerun", async () => {
  const queryInterface = makeQueryInterface();
  class Sequelize { static UUID = "UUID"; }

  await repairPaymentLinkPaymentReference(queryInterface, Sequelize);
  const firstRunOperationCount = queryInterface.operations.length;
  await repairPaymentLinkPaymentReference(queryInterface, Sequelize);

  assert.equal(queryInterface.operations.length, firstRunOperationCount);
});

test("payment link schema migration refuses an incompatible parent ID type", async () => {
  const queryInterface = makeQueryInterface({ paymentLinkIdType: "VARCHAR(36)" });
  class Sequelize { static UUID = "UUID"; }

  await assert.rejects(
    repairPaymentLinkPaymentReference(queryInterface, Sequelize),
    /payment_links\.id must be CHAR\(36\)/,
  );
  assert.deepEqual(queryInterface.operations, []);
});
