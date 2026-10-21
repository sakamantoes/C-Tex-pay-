import sequelize from "../config/database.js";
import { up } from "../migrations/20261022-ensure-withdrawal-fee-tiers.js";

const expectedDatabase = "u474959577_ctext_pay";
const confirmation = process.env.CONFIRM_WITHDRAWAL_FEE_TIERS_MIGRATION;

try {
  if (confirmation !== expectedDatabase) {
    throw new Error(
      `Refusing to migrate. Set CONFIRM_WITHDRAWAL_FEE_TIERS_MIGRATION=${expectedDatabase} after confirming the target database.`,
    );
  }
  if (sequelize.config.database !== expectedDatabase) {
    throw new Error(`Refusing to migrate unexpected database: ${sequelize.config.database || "(unset)"}`);
  }

  await sequelize.authenticate();
  await up(sequelize.getQueryInterface(), sequelize.constructor);
  console.info("Withdrawal fee tiers migration completed; existing configured fees were preserved.");
} catch (error) {
  console.error("Withdrawal fee tiers migration failed.", {
    errorName: error.name,
    errorMessage: error.message,
  });
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
