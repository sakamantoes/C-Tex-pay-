import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
  Payment,
  Payout,
  ReconciliationRun,
  ReconciliationDiscrepancy,
} from "../models/index.js";
import envConfig from "../config/constant.js";
import MonnifyReconciliationAdapter from "../Provider/monnify/monnify.reconciliation.adapter.js";

/* =========================================================
 * ERRORS
 * ======================================================= */

export class ReconciliationError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/* =========================================================
 * ADAPTER SELECTION
 * ======================================================= */

function getReconciliationAdapter(provider) {
  const p = String(provider || envConfig.PAYMENT_PROVIDER || "MONNIFY")
    .toUpperCase();
  if (p === "MONNIFY") return new MonnifyReconciliationAdapter();
  throw new ReconciliationError(
    `Unsupported reconciliation provider: ${p}`,
    "UNSUPPORTED_PROVIDER",
    400
  );
}

/* =========================================================
 * STATUS NORMALIZATION
 * ======================================================= */

function normalizePaymentStatus(providerStatus) {
  const s = String(providerStatus || "").toUpperCase();
  if (s === "PAID" || s === "SUCCESS" || s === "SUCCESSFUL") return "SUCCESS";
  if (s === "OVERPAID") return "SUCCESS";
  if (s === "PARTIALLY_PAID") return "PENDING";
  if (s === "PENDING" || s === "IN_PROGRESS" || s === "PROCESSING") return "PENDING";
  if (s === "FAILED" || s === "REVERSED") return "FAILED";
  if (s === "EXPIRED") return "EXPIRED";
  return "PENDING";
}

function normalizePayoutStatus(providerStatus) {
  const s = String(providerStatus || "").toUpperCase();
  if (s === "SUCCESS" || s === "SUCCESSFUL" || s === "COMPLETED") return "SUCCESS";
  if (s === "FAILED" || s === "REJECTED" || s === "ERROR") return "FAILED";
  if (s === "REVERSED") return "REVERSED";
  if (s === "PENDING" || s === "PROCESSING" || s === "IN_PROGRESS") return "PROCESSING";
  return "PROCESSING";
}

/* =========================================================
 * VALIDATION
 * ======================================================= */

const MAX_PERIOD_DAYS = 31;

function assertPeriod(periodStart, periodEnd) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ReconciliationError("Invalid period dates", "INVALID_PERIOD", 400);
  }
  if (end <= start) {
    throw new ReconciliationError(
      "periodEnd must be after periodStart",
      "INVALID_PERIOD",
      400
    );
  }
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (days > MAX_PERIOD_DAYS) {
    throw new ReconciliationError(
      `Period cannot exceed ${MAX_PERIOD_DAYS} days`,
      "PERIOD_TOO_LARGE",
      400
    );
  }
  return { start, end };
}

/* =========================================================
 * AMOUNT NORMALIZATION
 * ======================================================= */

/**
/**
 * The provider mapper (fromMonnifyVerifyResponse) is the single source of
 * truth for unit conversion. It returns `amount` / `amountPaid` in integer
 * kobo — already converted from Monnify's native naira.
 *
 * This helper does NOT do any conversion. It only reads and validates.
 *
 * @param {object} normalized - the adapter's normalized response
 * @returns {number|null} integer kobo, or null if no amount is available
 */
function normalizeProviderAmountToKobo(normalized) {
  if (!normalized || typeof normalized !== "object") return null;

  // Prefer `amount` (canonical), fall back to `amountPaid` (alias).
  const raw = normalized.amount ?? normalized.amountPaid ?? null;
  if (raw === null || raw === undefined) return null;

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;

  // Mapper guarantees this is an integer count of kobo.
  // Any non-integer means the mapper was changed and needs audit.
  return Math.round(n);
}
/* =========================================================
 * SEVERITY MAPPING
 * ======================================================= */

function severityForDiscrepancy(type) {
  switch (type) {
    case "MISSING_PROVIDER_RECORD":
    case "MISSING_INTERNAL_RECORD":
    case "UNKNOWN_PROVIDER_TRANSACTION":
      return "HIGH";
    case "AMOUNT_MISMATCH":
    case "CURRENCY_MISMATCH":
    case "DUPLICATE_PROVIDER_RECORD":
    case "DUPLICATE_INTERNAL_RECORD":
      return "CRITICAL";
    case "STATUS_MISMATCH":
    case "REFERENCE_MISMATCH":
    default:
      return "MEDIUM";
  }
}

/* =========================================================
 * PAYMENT RECONCILIATION
 * ======================================================= */

async function reconcilePayments({ run, adapter, merchantId }) {
  const where = {
    createdAt: { [Op.between]: [run.periodStart, run.periodEnd] },
  };
  if (merchantId) where.merchantId = merchantId;

  const internalPayments = await Payment.findAll({
    where,
    order: [["createdAt", "ASC"]],
    limit: 5000,
  });

  let matched = 0;
  let mismatched = 0;
  let missingProvider = 0;
  let missingInternal = 0;
  let amountMismatches = 0;
  let statusMismatches = 0;
  let errors = 0;

  const seenProviderRefs = new Set();

  for (const payment of internalPayments) {
    let providerResult;
    try {
      providerResult = await adapter.queryPayment({
        paymentReference: payment.paymentReference,
        providerReference: payment.providerReference,
      });
    } catch (error) {
      errors += 1;
      console.error("[recon] provider query error", {
        reconciliationId: run.id,
        paymentReference: payment.paymentReference,
        errorCode: error.code,
        errorMessage: error.message,
      });
      continue;
    }

    if (providerResult.notFound) {
      missingProvider += 1;
      await ReconciliationDiscrepancy.findOrCreate({
        where: {
          reconciliationId: run.id,
          providerReference: payment.providerReference || payment.paymentReference,
          type: "MISSING_PROVIDER_RECORD",
        },
        defaults: {
          merchantId: payment.merchantId,
          provider: run.provider,
          type: "MISSING_PROVIDER_RECORD",
          severity: severityForDiscrepancy("MISSING_PROVIDER_RECORD"),
          paymentId: payment.id,
          internalReference: payment.paymentReference,
          providerReference: payment.providerReference || null,
          internalStatus: payment.status,
          internalAmount: Number(payment.amount),
          currency: payment.currency,
          reason:
            "Internal payment has no corresponding record on the provider for the period.",
        },
      });
      continue;
    }

    const normalized = providerResult.normalized;
    const providerStatus = normalizePaymentStatus(normalized.providerStatus);
    const internalStatus = payment.status;

    if (normalized.providerReference) {
      seenProviderRefs.add(normalized.providerReference);
    }

    /*
     * Normalize provider amount to integer kobo using a single source of
     * truth. The mapper must declare its unit via `amountUnit`. If it
     * doesn't, we assume naira (Monnify's native unit) and convert once.
     */
    const providerAmountKobo = normalizeProviderAmountToKobo(normalized);

    if (providerAmountKobo === null) {
      // No amount to compare — record a status-only check
      const sameStatus = providerStatus === internalStatus;
      if (sameStatus) {
        matched += 1;
      } else {
        mismatched += 1;
        statusMismatches += 1;
        await ReconciliationDiscrepancy.findOrCreate({
          where: {
            reconciliationId: run.id,
            providerReference:
              normalized.providerReference || payment.paymentReference,
            type: "STATUS_MISMATCH",
          },
          defaults: {
            merchantId: payment.merchantId,
            provider: run.provider,
            type: "STATUS_MISMATCH",
            severity: severityForDiscrepancy("STATUS_MISMATCH"),
            paymentId: payment.id,
            internalReference: payment.paymentReference,
            providerReference: normalized.providerReference || null,
            internalStatus,
            providerStatus: normalized.providerStatus,
            currency: payment.currency,
            reason: `Status mismatch (amount unavailable): internal=${internalStatus} provider=${normalized.providerStatus}`,
          },
        });
      }
      continue;
    }

    const sameRef =
      !normalized.paymentReference ||
      normalized.paymentReference === payment.paymentReference;
    const sameCurrency =
      !normalized.currency || normalized.currency === payment.currency;
    const sameAmount = providerAmountKobo === Number(payment.amount);
    const sameStatus = providerStatus === internalStatus;

    if (sameRef && sameCurrency && sameAmount && sameStatus) {
      matched += 1;
      continue;
    }

    mismatched += 1;

    if (!sameStatus) {
      statusMismatches += 1;
      await ReconciliationDiscrepancy.findOrCreate({
        where: {
          reconciliationId: run.id,
          providerReference: normalized.providerReference || payment.paymentReference,
          type: "STATUS_MISMATCH",
        },
        defaults: {
          merchantId: payment.merchantId,
          provider: run.provider,
          type: "STATUS_MISMATCH",
          severity: severityForDiscrepancy("STATUS_MISMATCH"),
          paymentId: payment.id,
          internalReference: payment.paymentReference,
          providerReference: normalized.providerReference || null,
          internalStatus,
          providerStatus: normalized.providerStatus,
          internalAmount: Number(payment.amount),
          providerAmount: providerAmountKobo,
          currency: payment.currency,
          reason: `Status mismatch: internal=${internalStatus} provider=${normalized.providerStatus}`,
        },
      });
    }

    if (!sameAmount) {
      amountMismatches += 1;
      await ReconciliationDiscrepancy.findOrCreate({
        where: {
          reconciliationId: run.id,
          providerReference: normalized.providerReference || payment.paymentReference,
          type: "AMOUNT_MISMATCH",
        },
        defaults: {
          merchantId: payment.merchantId,
          provider: run.provider,
          type: "AMOUNT_MISMATCH",
          severity: severityForDiscrepancy("AMOUNT_MISMATCH"),
          paymentId: payment.id,
          internalReference: payment.paymentReference,
          providerReference: normalized.providerReference || null,
          internalAmount: Number(payment.amount),
          providerAmount: providerAmountKobo,
          currency: payment.currency,
          reason: `Amount mismatch: internal=${Number(payment.amount)} kobo provider=${providerAmountKobo} kobo`,
        },
      });
    }

    if (!sameCurrency) {
      await ReconciliationDiscrepancy.findOrCreate({
        where: {
          reconciliationId: run.id,
          providerReference: normalized.providerReference || payment.paymentReference,
          type: "CURRENCY_MISMATCH",
        },
        defaults: {
          merchantId: payment.merchantId,
          provider: run.provider,
          type: "CURRENCY_MISMATCH",
          severity: severityForDiscrepancy("CURRENCY_MISMATCH"),
          paymentId: payment.id,
          internalReference: payment.paymentReference,
          providerReference: normalized.providerReference || null,
          currency: payment.currency,
          reason: `Currency mismatch: internal=${payment.currency} provider=${normalized.currency}`,
        },
      });
    }
  }

  return {
    totalInternalRecords: internalPayments.length,
    matchedRecords: matched,
    mismatchedRecords: mismatched,
    missingInternalRecords: missingInternal,
    missingProviderRecords: missingProvider,
    amountMismatches,
    statusMismatches,
    errorCount: errors,
  };
}

/* =========================================================
 * PAYOUT RECONCILIATION
 * ======================================================= */

async function reconcilePayouts({ run, adapter, merchantId }) {
  const where = {
    createdAt: { [Op.between]: [run.periodStart, run.periodEnd] },
  };
  if (merchantId) where.merchantId = merchantId;

  const internalPayouts = await Payout.findAll({
    where,
    order: [["createdAt", "ASC"]],
    limit: 5000,
  });

  let matched = 0;
  let mismatched = 0;
  let missingProvider = 0;
  let amountMismatches = 0;
  let statusMismatches = 0;
  let errors = 0;

  for (const payout of internalPayouts) {
    if (!payout.providerReference) {
      continue;
    }

    let providerResult;
    try {
      providerResult = await adapter.queryPayout({
        reference: payout.providerReference,
      });
    } catch (error) {
      errors += 1;
      console.error("[recon] provider payout query error", {
        reconciliationId: run.id,
        payoutId: payout.id,
        errorCode: error.code,
        errorMessage: error.message,
      });
      continue;
    }

    if (providerResult.notFound || !providerResult.normalized) {
      missingProvider += 1;
      await ReconciliationDiscrepancy.findOrCreate({
        where: {
          reconciliationId: run.id,
          providerReference: payout.providerReference,
          type: "MISSING_PROVIDER_RECORD",
        },
        defaults: {
          merchantId: payout.merchantId,
          provider: run.provider,
          type: "MISSING_PROVIDER_RECORD",
          severity: severityForDiscrepancy("MISSING_PROVIDER_RECORD"),
          payoutId: payout.id,
          internalReference: payout.id,
          providerReference: payout.providerReference,
          internalStatus: payout.status,
          internalAmount: Number(payout.amount),
          currency: payout.currency,
          reason: "Internal payout has no corresponding record on the provider.",
        },
      });
      continue;
    }

    const normalized = providerResult.normalized;
    const providerStatus = normalizePayoutStatus(normalized.providerStatus);
    const internalStatus = payout.status;

    const statusEquivalent =
      (internalStatus === "PROCESSING" &&
        (providerStatus === "PROCESSING" || providerStatus === "PENDING")) ||
      internalStatus === providerStatus;

    /*
     * Normalize payout amount the same way as payments. The adapter
     * declares its unit via `amountUnit` if not naira.
     */
    const providerAmountKobo = normalizeProviderAmountToKobo(normalized);
    const sameAmount =
      providerAmountKobo === null ||
      providerAmountKobo === Number(payout.amount);

    if (statusEquivalent && sameAmount) {
      matched += 1;
      continue;
    }

    mismatched += 1;

    if (!statusEquivalent) {
      statusMismatches += 1;
      await ReconciliationDiscrepancy.findOrCreate({
        where: {
          reconciliationId: run.id,
          providerReference: payout.providerReference,
          type: "STATUS_MISMATCH",
        },
        defaults: {
          merchantId: payout.merchantId,
          provider: run.provider,
          type: "STATUS_MISMATCH",
          severity: severityForDiscrepancy("STATUS_MISMATCH"),
          payoutId: payout.id,
          internalReference: payout.id,
          providerReference: payout.providerReference,
          internalStatus,
          providerStatus: normalized.providerStatus,
          internalAmount: Number(payout.amount),
          providerAmount: providerAmountKobo,
          currency: payout.currency,
          reason: `Payout status mismatch: internal=${internalStatus} provider=${normalized.providerStatus}`,
        },
      });
    }

    if (!sameAmount && providerAmountKobo !== null) {
      amountMismatches += 1;
      await ReconciliationDiscrepancy.findOrCreate({
        where: {
          reconciliationId: run.id,
          providerReference: payout.providerReference,
          type: "AMOUNT_MISMATCH",
        },
        defaults: {
          merchantId: payout.merchantId,
          provider: run.provider,
          type: "AMOUNT_MISMATCH",
          severity: severityForDiscrepancy("AMOUNT_MISMATCH"),
          payoutId: payout.id,
          internalReference: payout.id,
          providerReference: payout.providerReference,
          internalAmount: Number(payout.amount),
          providerAmount: providerAmountKobo,
          currency: payout.currency,
          reason: `Payout amount mismatch: internal=${Number(payout.amount)} kobo provider=${providerAmountKobo} kobo`,
        },
      });
    }
  }

  return {
    totalInternalRecords: internalPayouts.length,
    matchedRecords: matched,
    mismatchedRecords: mismatched,
    missingInternalRecords: 0,
    missingProviderRecords: missingProvider,
    amountMismatches,
    statusMismatches,
    errorCount: errors,
  };
}

/* =========================================================
 * PUBLIC — RUN RECONCILIATION
 * ======================================================= */

export async function runReconciliation({
  reconciliationType,
  provider,
  periodStart,
  periodEnd,
  merchantId = null,
  triggeredBy = null,
  metadata = null,
}) {
  if (!["PAYMENTS", "PAYOUTS", "FULL"].includes(reconciliationType)) {
    throw new ReconciliationError(
      "reconciliationType must be PAYMENTS | PAYOUTS | FULL",
      "INVALID_TYPE",
      400
    );
  }

  const { start, end } = assertPeriod(periodStart, periodEnd);

  const run = await ReconciliationRun.create({
    provider: provider || envConfig.PAYMENT_PROVIDER || "MONNIFY",
    reconciliationType,
    status: "RUNNING",
    merchantId,
    periodStart: start,
    periodEnd: end,
    startedAt: new Date(),
    triggeredBy,
    metadata,
  });

  console.log("[recon] started", {
    reconciliationId: run.id,
    provider: run.provider,
    reconciliationType,
    periodStart: start,
    periodEnd: end,
    merchantId,
  });

  let adapter;
  try {
    adapter = getReconciliationAdapter(run.provider);
  } catch (error) {
    await run.update({
      status: "FAILED",
      completedAt: new Date(),
      lastError: error.message,
    });
    throw error;
  }

  let summary = {
    totalInternalRecords: 0,
    matchedRecords: 0,
    mismatchedRecords: 0,
    missingInternalRecords: 0,
    missingProviderRecords: 0,
    amountMismatches: 0,
    statusMismatches: 0,
    errorCount: 0,
  };

  try {
    if (reconciliationType === "PAYMENTS" || reconciliationType === "FULL") {
      const paymentSummary = await reconcilePayments({ run, adapter, merchantId });
      summary = mergeSummaries(summary, paymentSummary);
    }

    if (reconciliationType === "PAYOUTS" || reconciliationType === "FULL") {
      const payoutSummary = await reconcilePayouts({ run, adapter, merchantId });
      summary = mergeSummaries(summary, payoutSummary);
    }

    const finalStatus = summary.errorCount > 0 ? "PARTIAL" : "COMPLETED";

    await run.update({
      status: finalStatus,
      completedAt: new Date(),
      totalRecords: summary.totalInternalRecords,
      matchedRecords: summary.matchedRecords,
      mismatchedRecords: summary.mismatchedRecords,
      missingInternalRecords: summary.missingInternalRecords,
      missingProviderRecords: summary.missingProviderRecords,
      amountMismatches: summary.amountMismatches,
      statusMismatches: summary.statusMismatches,
      errorCount: summary.errorCount,
    });

    console.log("[recon] completed", {
      reconciliationId: run.id,
      status: finalStatus,
      ...summary,
    });

    return { run: await run.reload(), summary };
  } catch (error) {
    console.error("[recon] failed", {
      reconciliationId: run.id,
      errorName: error.name,
      errorMessage: error.message,
    });
    await run.update({
      status: "FAILED",
      completedAt: new Date(),
      lastError: String(error.message || error.name).slice(0, 1000),
    });
    throw error;
  }
}

function mergeSummaries(a, b) {
  return {
    totalInternalRecords: a.totalInternalRecords + b.totalInternalRecords,
    matchedRecords: a.matchedRecords + b.matchedRecords,
    mismatchedRecords: a.mismatchedRecords + b.mismatchedRecords,
    missingInternalRecords: a.missingInternalRecords + b.missingInternalRecords,
    missingProviderRecords: a.missingProviderRecords + b.missingProviderRecords,
    amountMismatches: a.amountMismatches + b.amountMismatches,
    statusMismatches: a.statusMismatches + b.statusMismatches,
    errorCount: a.errorCount + b.errorCount,
  };
}

/* =========================================================
 * QUERIES
 * ======================================================= */

export async function listReconciliationRuns({
  page = 1,
  limit = 20,
  status = null,
  reconciliationType = null,
} = {}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const where = {};
  if (status) where.status = status;
  if (reconciliationType) where.reconciliationType = reconciliationType;

  const { count, rows } = await ReconciliationRun.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });

  return {
    runs: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}

export async function getReconciliationRun(id) {
  return ReconciliationRun.findByPk(id, {
    include: [
      {
        model: ReconciliationDiscrepancy,
        as: "discrepancies",
        separate: true,
        limit: 100,
        order: [["createdAt", "ASC"]],
      },
    ],
  });
}

export async function listDiscrepancies({
  reconciliationId = null,
  status = null,
  severity = null,
  type = null,
  page = 1,
  limit = 20,
} = {}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const where = {};
  if (reconciliationId) where.reconciliationId = reconciliationId;
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (type) where.type = type;

  const { count, rows } = await ReconciliationDiscrepancy.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });

  return {
    discrepancies: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}

export async function getDiscrepancy(id) {
  return ReconciliationDiscrepancy.findByPk(id);
}

/* =========================================================
 * RESOLUTION TRACKING (no money movement)
 * ======================================================= */

const ALLOWED_RESOLUTION_TRANSITIONS = {
  OPEN: ["INVESTIGATING", "RESOLVED", "IGNORED"],
  INVESTIGATING: ["RESOLVED", "IGNORED"],
  RESOLVED: [],
  IGNORED: [],
};

export async function updateDiscrepancyStatus({
  discrepancyId,
  status,
  resolvedBy,
  resolutionNote = null,
}) {
  if (!["INVESTIGATING", "RESOLVED", "IGNORED"].includes(status)) {
    throw new ReconciliationError(
      "status must be INVESTIGATING | RESOLVED | IGNORED",
      "INVALID_STATUS",
      400
    );
  }

  const disc = await ReconciliationDiscrepancy.findByPk(discrepancyId);
  if (!disc) {
    throw new ReconciliationError("Discrepancy not found", "NOT_FOUND", 404);
  }

  const allowed = ALLOWED_RESOLUTION_TRANSITIONS[disc.status] || [];
  if (!allowed.includes(status)) {
    throw new ReconciliationError(
      `Cannot transition discrepancy from ${disc.status} to ${status}`,
      "INVALID_STATE_TRANSITION",
      409
    );
  }

  const patch = { status };
  if (status === "RESOLVED" || status === "IGNORED") {
    patch.resolvedAt = new Date();
    patch.resolvedBy = resolvedBy || null;
    patch.resolutionNote = resolutionNote
      ? String(resolutionNote).slice(0, 1000)
      : null;
  }
  await disc.update(patch);
  return disc;
}