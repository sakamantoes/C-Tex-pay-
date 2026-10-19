import sequelize from "../config/database.js";
import { up as addPayoutFeeSnapshot } from "../migrations/20261020-add-payout-fee-snapshot.js";

try {
  await sequelize.authenticate();
  await addPayoutFeeSnapshot(sequelize.getQueryInterface(), sequelize.constructor);
  console.info("Payout fee snapshot schema migration completed.");
} catch (error) {
  console.error("Payout fee snapshot migration failed.", {
    errorName: error.name,
    errorMessage: error.message,
  });
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
