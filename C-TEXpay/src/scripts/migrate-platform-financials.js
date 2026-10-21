import sequelize from "../config/database.js";
import { up } from "../migrations/20261021-add-financial-snapshots-and-withdrawal-fees.js";

try {
  await sequelize.authenticate();
  await up(sequelize.getQueryInterface(), sequelize.constructor);
  console.info("Platform financial snapshots and withdrawal fee tiers migration completed.");
} catch (error) {
  console.error("Platform financial migration failed.", { errorName: error.name, errorMessage: error.message });
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
