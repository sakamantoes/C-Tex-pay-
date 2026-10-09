import sequelize from "../C-TEXpay/src/config/database.js";
import { Payment } from "../C-TEXpay/src/models/index.js";
import { enqueueSuccessfulPaymentNotifications } from "../C-TEXpay/src/service/merchantNotification.service.js";

const REFS = [
  "CTX_pay_saka__20261005_2084BC84134F930D",
  "CTX_pay_saka__20261004_D6069D103F148B41",
];

async function main() {
  await sequelize.authenticate();

  for (const ref of REFS) {
    const payment = await Payment.findOne({
      where: { paymentReference: ref },
    });

    if (!payment) {
      console.log("Payment not found:", ref);
      continue;
    }

    const result = await enqueueSuccessfulPaymentNotifications({
      payment,
      transaction: null,
    });

    console.log("Enqueued", ref, result);
  }
}

main()
  .catch((error) => {
    console.error("Backfill error:", error);
  })
  .finally(async () => {
    await sequelize.close();
  });