import sequelize from "../config/database.js";
import { up as addMerchantRedirectUrls } from "../migrations/20261016-add-merchant-redirect-urls.js";

try {
  await sequelize.authenticate();
  await addMerchantRedirectUrls(
    sequelize.getQueryInterface(),
    sequelize.constructor,
  );
  console.info("Merchant redirect URL schema migration completed.");
} catch (error) {
  console.error("Merchant redirect URL schema migration failed.", {
    errorName: error.name,
    errorMessage: error.message,
  });
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
