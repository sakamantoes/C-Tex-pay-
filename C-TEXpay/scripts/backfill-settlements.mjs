import sequelize from "../src/config/database.js";
import { Payment, FeeRecord } from "../src/models/index.js";
import { postPaymentSettlement } from "../src/service/ledger.service.js";

async function main() {
  await sequelize.authenticate();

  const payments = await Payment.findAll({
    where: { status: "SUCCESS" },
    order: [["createdAt", "ASC"]],
  });

  console.log(`Found ${payments.length} SUCCESS payments`);

  let posted = 0;
  let skipped = 0;
  let failed = 0;
  let noFeeRecord = 0;

  for (const payment of payments) {
    // Pre-check: skip payments that never had a fee record (pre-Stage-12)
    const hasFee = await FeeRecord.count({ where: { paymentId: payment.id } });
    if (hasFee === 0) {
      noFeeRecord += 1;
      console.log(`NO-FEE  ${payment.paymentReference} (pre-Stage-12, skipping)`);
      continue;
    }

    try {
      const result = await postPaymentSettlement({ paymentId: payment.id });
      if (result.created) {
        posted += 1;
        console.log(
          `POSTED  ${payment.paymentReference} → ${result.transaction.reference}`
        );
      } else {
        skipped += 1;
        console.log(`SKIPPED ${payment.paymentReference} (already settled)`);
      }
    } catch (error) {
      failed += 1;
      console.error(
        `FAILED  ${payment.paymentReference} [${error.code || error.name}] ${error.message}`
      );
    }
  }

  console.log("---");
  console.log({ posted, skipped, failed, noFeeRecord, total: payments.length });
}

main()
  .catch((error) => {
    console.error("Backfill fatal error:", error);
  })
  .finally(async () => {
    await sequelize.close();
  });