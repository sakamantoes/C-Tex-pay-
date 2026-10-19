import sequelize from "../config/database.js";
import { up as backfillMerchantOnboardingStatus } from "../migrations/20261019-backfill-merchant-onboarding-status.js";

try {
  await sequelize.authenticate();
  await backfillMerchantOnboardingStatus(sequelize.getQueryInterface());
  console.info("Merchant onboarding statuses backfilled successfully.");
} catch (error) {
  console.error("Merchant onboarding status backfill failed.", { errorName: error.name });
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
