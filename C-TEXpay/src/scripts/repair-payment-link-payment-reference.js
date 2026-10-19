import sequelize from "../config/database.js";
import { up as repairPaymentLinkPaymentReference } from "../migrations/20261020-repair-payment-link-payment-reference.js";

try {
  await sequelize.authenticate();
  await repairPaymentLinkPaymentReference(
    sequelize.getQueryInterface(),
    sequelize.constructor,
  );
  console.info("Payment Link payment reference schema repaired successfully.");
} catch (error) {
  console.error("Payment Link payment reference schema repair failed.", {
    errorName: error.name,
    errorMessage: error.message,
  });
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
