import sequelize from "../config/database.js";
import { up } from "../migrations/20261021-add-fee-record-financial-columns.js";

const expectedDatabase = "u474959577_ctext_pay";
const confirmation = process.env.CONFIRM_FEE_RECORD_FINANCIAL_MIGRATION;

try {
  if (confirmation !== expectedDatabase) {
    throw new Error(
      `Refusing to migrate. Set CONFIRM_FEE_RECORD_FINANCIAL_MIGRATION=${expectedDatabase} after confirming the target database.`,
    );
  }
  if (sequelize.config.database !== expectedDatabase) {
    throw new Error(`Refusing to migrate unexpected database: ${sequelize.config.database || "(unset)"}`);
  }

  await sequelize.authenticate();
  await up(sequelize.getQueryInterface(), sequelize.constructor);
  console.info("Fee-record financial columns migration completed.");
} catch (error) {
  console.error("Fee-record financial columns migration failed.", {
    errorName: error.name,
    errorMessage: error.message,
  });
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
