// src/jobs/paymentExpiry.job.js
import { Op } from "sequelize";
import { Payment, PaymentStatusHistory } from "../models/index.js";
import sequelize from "../config/database.js";

const BATCH_SIZE = 100;
let timer = null;
let running = false;

async function expireOverduePayments() {
  const now = new Date();

  const expiredCandidates = await Payment.findAll({
    where: {
      status: "PENDING",
      expiresAt: { [Op.lt]: now },
    },
    limit: BATCH_SIZE,
    order: [["expiresAt", "ASC"]],
  });

  if (expiredCandidates.length === 0) return { expired: 0 };

  let expired = 0;
  for (const payment of expiredCandidates) {
    try {
      await sequelize.transaction(async (t) => {
        const locked = await Payment.findOne({
          where: { id: payment.id, status: "PENDING" },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!locked) return;

        await locked.update(
          {
            status: "EXPIRED",
            providerStatus: locked.providerStatus || "EXPIRED",
          },
          { transaction: t }
        );

        await PaymentStatusHistory.create(
          {
            paymentId: locked.id,
            previousStatus: "PENDING",
            newStatus: "EXPIRED",
            reason: "Payment expired without completion",
            source: "SYSTEM",
          },
          { transaction: t }
        );
      });
      expired += 1;
    } catch (error) {
      console.error("[payment-expiry] failed to expire payment", {
        paymentId: payment.id,
        errorName: error.name,
        errorMessage: error.message,
      });
    }
  }

  return { expired };
}

async function runOnce() {
  if (running) return;
  running = true;
  try {
    const result = await expireOverduePayments();
    if (result.expired > 0) {
      console.log("[payment-expiry] expired payments", result);
    }
  } catch (error) {
    console.error("[payment-expiry] run failed", {
      errorName: error.name,
      errorMessage: error.message,
    });
  } finally {
    running = false;
  }
}

export function startPaymentExpiryWorker(intervalMs = 5 * 60 * 1000) {
  if (timer) return;
  timer = setInterval(runOnce, intervalMs);
  timer.unref?.();
  console.log(`[payment-expiry] started, interval ${intervalMs / 1000}s`);
  void runOnce();
}

export function stopPaymentExpiryWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}