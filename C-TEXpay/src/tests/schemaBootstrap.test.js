import test from "node:test";
import assert from "node:assert/strict";
import "../models/index.js";
import sequelize from "../config/database.js";
import {
  assertDatabaseHasNoTables,
  assertEmptySchemaBootstrapTarget,
  verifyRegisteredModelSchema,
} from "../utils/emptyProductionSchemaBootstrap.js";

test("bootstrap requires explicit confirmation and the exact target database", () => {
  assert.throws(
    () => assertEmptySchemaBootstrapTarget({
      confirmation: "false",
      configuredDatabase: "u474959577_ctext_pay",
      connectedDatabase: "u474959577_ctext_pay",
    }),
    /ALLOW_EMPTY_PRODUCTION_SCHEMA_BOOTSTRAP=true/,
  );

  assert.throws(
    () => assertEmptySchemaBootstrapTarget({
      confirmation: "true",
      configuredDatabase: "other_database",
      connectedDatabase: "other_database",
    }),
    /restricted to database u474959577_ctext_pay/,
  );

  assert.doesNotThrow(() => assertEmptySchemaBootstrapTarget({
    confirmation: "true",
    configuredDatabase: "u474959577_ctext_pay",
    connectedDatabase: "u474959577_ctext_pay",
  }));
});

test("bootstrap refuses to proceed when any table exists", async () => {
  await assert.rejects(
    assertDatabaseHasNoTables({
      showAllTables: async () => ["permissions"],
    }),
    /database is not empty/,
  );
  await assert.doesNotReject(
    assertDatabaseHasNoTables({ showAllTables: async () => [] }),
  );
});

test("every registered model schema has verifiable tables, indexes, and references", async () => {
  const models = Object.values(sequelize.models);
  assert.ok(models.length >= 35, `expected all models registered, got ${models.length}`);

  const queryInterface = {
    showAllTables: async () => models.map((model) => model.getTableName()),
    describeTable: async (tableName) => {
      const model = models.find((item) => item.getTableName() === tableName);
      return Object.fromEntries(
        Object.entries(model.rawAttributes).map(([name, attribute]) => [
          attribute.field || name,
          { allowNull: attribute.allowNull },
        ]),
      );
    },
    showIndex: async (tableName) => {
      const model = models.find((item) => item.getTableName() === tableName);
      return (model.options.indexes || []).map((index) => ({
        unique: Boolean(index.unique),
        fields: index.fields.map((field) => {
          const name = typeof field === "string"
            ? field
            : field.attribute || field.name || field.field;
          return { attribute: model.rawAttributes[name]?.field || name };
        }),
      }));
    },
    getForeignKeyReferencesForTable: async (tableName) => {
      const model = models.find((item) => item.getTableName() === tableName);
      return Object.entries(model.rawAttributes)
        .filter(([, attribute]) => attribute.references)
        .map(([name, attribute]) => ({
          columnName: attribute.field || name,
          referencedTableName: attribute.references.model,
          referencedColumnName: attribute.references.key || "id",
        }));
    },
  };

  const result = await verifyRegisteredModelSchema(queryInterface, models);
  assert.equal(result.modelCount, models.length);
  assert.ok(models.find((model) => model.tableName === "permissions"));

  const payment = models.find((model) => model.tableName === "payments");
  assert.ok(payment.rawAttributes.paymentLinkId);
  assert.ok(payment.associations.paymentLink);
  const apiKey = models.find((model) => model.tableName === "api_keys");
  assert.ok(apiKey.rawAttributes.keyEncrypted);
  const merchantSetting = models.find((model) => model.tableName === "merchant_settings");
  assert.ok(merchantSetting.rawAttributes.successRedirectUrl);
  assert.ok(merchantSetting.rawAttributes.failureRedirectUrl);
  assert.ok(merchantSetting.rawAttributes.cancelRedirectUrl);
  const notificationDelivery = models.find(
    (model) => model.tableName === "merchant_notification_deliveries",
  );
  assert.equal(notificationDelivery.rawAttributes.nextAttemptAt.allowNull, true);
  const merchant = models.find((model) => model.tableName === "merchants");
  assert.ok(merchant.rawAttributes.onboardingStatus);
  const payout = models.find((model) => model.tableName === "payouts");
  for (const field of ["feeMode", "feeAmount", "walletDebitAmount", "beneficiaryAmount", "feeSnapshot"]) {
    assert.ok(payout.rawAttributes[field], `missing migration-backed payout field ${field}`);
  }
});
