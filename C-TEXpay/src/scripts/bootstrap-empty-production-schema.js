import sequelize from "../config/database.js";
import "../models/index.js";
import { seedPermissions } from "../seeders/2024XXXXXX-permissions.js";
import feePermissionSeed from "../seeders/20261003-fee-permissions.js";
import ledgerPermissionSeed from "../seeders/20261005-ledger-permissions.js";
import payoutPermissionSeed from "../seeders/20261005-payout-permissions.js";
import reconciliationPermissionSeed from "../seeders/20261006-reconciliation-permissions.js";
import paymentLinkPermissionSeed from "../seeders/20261013-payment-link-permissions.js";
import { up as addApiKeyEncryptedColumn } from "../migrations/2026XXXXXX-add-api-key-encrypted.js";
import { up as makeNextAttemptAtNullable } from "../migrations/20261005-make-nextAttemptAt-nullable.js";
import { up as addMerchantRedirectUrls } from "../migrations/20261016-add-merchant-redirect-urls.js";
import { up as addPayoutFeeSnapshot } from "../migrations/20261020-add-payout-fee-snapshot.js";
import { up as repairPaymentLinkPaymentReference } from "../migrations/20261020-repair-payment-link-payment-reference.js";
import {
  assertDatabaseHasNoTables,
  assertEmptySchemaBootstrapTarget,
  verifyRegisteredModelSchema,
} from "../utils/emptyProductionSchemaBootstrap.js";

let exitCode = 0;

try {
  assertEmptySchemaBootstrapTarget({
    confirmation: process.env.ALLOW_EMPTY_PRODUCTION_SCHEMA_BOOTSTRAP,
    configuredDatabase: process.env.DB_NAME,
    connectedDatabase: sequelize.config.database,
  });

  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();

  // This check intentionally precedes every schema write. Even one table is
  // enough to abort; this tool never repairs, drops, or truncates existing data.
  await assertDatabaseHasNoTables(queryInterface);

  console.info("[schema-bootstrap] Verified the explicitly approved empty database.");

  // Importing models/index.js above registers every model and association.
  // force/alter remain false; the empty-database check makes this a create-only sync.
  await sequelize.sync({ force: false, alter: false, logging: false });

  // Reconcile schema deltas represented by migrations. These migrations are
  // idempotent or are safe here because the database started with no tables.
  await addApiKeyEncryptedColumn(queryInterface, sequelize.constructor);
  await makeNextAttemptAtNullable(queryInterface, sequelize.constructor);
  await addMerchantRedirectUrls(queryInterface, sequelize.constructor);
  await addPayoutFeeSnapshot(queryInterface, sequelize.constructor);
  await repairPaymentLinkPaymentReference(queryInterface, sequelize.constructor);

  const schemaResult = await verifyRegisteredModelSchema(
    queryInterface,
    Object.values(sequelize.models),
  );
  console.info("[schema-bootstrap] Model schema verified.", schemaResult);

  // This seeder creates the permission catalogue and grants to OWNER roles
  // already present. The app creates merchant-scoped OWNER roles later, when
  // a merchant is created; bootstrap must not create business records.
  const corePermissions = await seedPermissions();
  await feePermissionSeed.seed();
  await ledgerPermissionSeed.seed();
  await payoutPermissionSeed.seed();
  await reconciliationPermissionSeed.seed();
  await paymentLinkPermissionSeed.seed();

  console.info("[schema-bootstrap] Permission seeders completed.", {
    permissions: corePermissions.total,
    ownerRolesProcessed: corePermissions.ownerRolesProcessed,
  });
} catch (error) {
  exitCode = 1;
  console.error("[schema-bootstrap] Bootstrap failed; no tables were dropped or truncated.", {
    errorName: error.name,
    errorMessage: error.message,
  });
} finally {
  try {
    await sequelize.close();
  } catch (error) {
    exitCode = 1;
    console.error("[schema-bootstrap] Database connection close failed.", {
      errorName: error.name,
      errorMessage: error.message,
    });
  }
  process.exitCode = exitCode;
}
