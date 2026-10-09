import sequelize from "../C-TEXpay/src/config/database.js";
import { Payment } from "../C-TEXpay/src/models/index.js";
import { postPaymentSettlement } from "../C-TEXpay/src/service/ledger.service.js";

const PAYMENT_REFERENCE =
  process.argv[2] || "CTX_pay_saka__20261005_74F22EE4D664BA37";

async function main() {
  await sequelize.authenticate();

  const payment = await Payment.findOne({
    where: { paymentReference: PAYMENT_REFERENCE },
  });

  if (!payment) {
    console.log("Payment not found:", PAYMENT_REFERENCE);
    return;
  }

  console.log("Payment status:", payment.status);
  console.log("Settling payment:", payment.id);

  const result = await postPaymentSettlement({ paymentId: payment.id });

  console.log("=== SUCCESS ===");
  console.log("Created:", result.created);
  console.log("Transaction ID:", result.transaction.id);
  console.log("Reference:", result.transaction.reference);
  console.log("Type:", result.transaction.type);
}

main()
  .catch((error) => {
    console.error("=== ERROR ===");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
  })
  .finally(async () => {
    await sequelize.close();
  });