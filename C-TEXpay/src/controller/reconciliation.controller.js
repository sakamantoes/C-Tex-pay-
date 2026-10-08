import {
  runReconciliation,
  listReconciliationRuns,
  getReconciliationRun,
  listDiscrepancies,
  getDiscrepancy,
  updateDiscrepancyStatus,
  ReconciliationError,
} from "../service/reconciliation.service.js";

function mapError(error) {
  if (error instanceof ReconciliationError) {
    return { status: error.statusCode, message: error.message };
  }
  if (error.statusCode) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Internal error" };
}

function serializeRun(run) {
  if (!run) return null;
  const d = run.toJSON ? run.toJSON() : run;
  return {
    id: d.id,
    provider: d.provider,
    reconciliationType: d.reconciliationType,
    status: d.status,
    merchantId: d.merchantId,
    period: { start: d.periodStart, end: d.periodEnd },
    startedAt: d.startedAt,
    completedAt: d.completedAt,
    summary: {
      totalInternalRecords: d.totalRecords,
      matchedRecords: d.matchedRecords,
      mismatchedRecords: d.mismatchedRecords,
      missingInternalRecords: d.missingInternalRecords,
      missingProviderRecords: d.missingProviderRecords,
      amountMismatches: d.amountMismatches,
      statusMismatches: d.statusMismatches,
      errorCount: d.errorCount,
    },
    triggeredBy: d.triggeredBy,
    lastError: d.lastError,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const startReconciliation = async (req, res) => {
  try {
    const result = await runReconciliation({
      reconciliationType: req.body.type,
      provider: req.body.provider,
      periodStart: req.body.periodStart,
      periodEnd: req.body.periodEnd,
      merchantId: req.body.merchantId || null,
      triggeredBy: req.user?.id || null,
      metadata: req.body.metadata || null,
    });

    return res.status(201).json({
      success: true,
      message: "Reconciliation completed",
      data: serializeRun(result.run),
    });
  } catch (error) {
    const { status, message } = mapError(error);
    console.error("Reconciliation start failed", {
      userId: req.user?.id,
      errorCode: error.code,
      errorMessage: error.message,
    });
    return res.status(status).json({ success: false, message });
  }
};

export const listRuns = async (req, res) => {
  try {
    const result = await listReconciliationRuns({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      reconciliationType: req.query.reconciliationType,
    });
    return res.status(200).json({
      success: true,
      data: result.runs.map(serializeRun),
      meta: result.pagination,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const getRun = async (req, res) => {
  try {
    const run = await getReconciliationRun(req.params.id);
    if (!run) {
      return res
        .status(404)
        .json({ success: false, message: "Reconciliation not found" });
    }
    const data = serializeRun(run);
    data.discrepancies = (run.discrepancies || []).map((d) => ({
      id: d.id,
      type: d.type,
      severity: d.severity,
      status: d.status,
      internalReference: d.internalReference,
      providerReference: d.providerReference,
      internalStatus: d.internalStatus,
      providerStatus: d.providerStatus,
      reason: d.reason,
      createdAt: d.createdAt,
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const listDiscrepancyList = async (req, res) => {
  try {
    const result = await listDiscrepancies({
      reconciliationId: req.query.reconciliationId,
      status: req.query.status,
      severity: req.query.severity,
      type: req.query.type,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.status(200).json({
      success: true,
      data: result.discrepancies,
      meta: result.pagination,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const getOneDiscrepancy = async (req, res) => {
  try {
    const disc = await getDiscrepancy(req.params.id);
    if (!disc) {
      return res
        .status(404)
        .json({ success: false, message: "Discrepancy not found" });
    }
    return res.status(200).json({ success: true, data: disc });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const updateDiscrepancy = async (req, res) => {
  try {
    const updated = await updateDiscrepancyStatus({
      discrepancyId: req.params.id,
      status: req.body.status,
      resolvedBy: req.user?.id || null,
      resolutionNote: req.body.resolutionNote,
    });
    return res.status(200).json({
      success: true,
      message: "Discrepancy updated",
      data: updated,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};