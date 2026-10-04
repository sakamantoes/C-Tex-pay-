import { Router } from "express";
import { handleMonnifyWebhook } from "./monnify.webhook.controller.js";
import envConfig from "../config/constant.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Route-scoped raw-body capture
|--------------------------------------------------------------------------
| Monnify's HMAC-SHA512 signature is computed over the exact request
| bytes. We read the stream ONCE, preserve it on req.rawBody, then
| parse JSON manually so downstream code can use req.body.
|
| Hard limits:
|   - Enforced body size (default 256 KB).
|   - Rejects incomplete streams and unexpected terminations.
|   - Never trusts a client-supplied req.rawBody.
*/

const MAX_BYTES = envConfig.MONNIFY_WEBHOOK_MAX_BYTES || 256 * 1024;

function captureRawBody(req, res, next) {
  // Reject early if Content-Length already exceeds the limit.
  const declaredLength = parseInt(req.headers["content-length"], 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    return res.status(413).json({ success: false, message: "Payload too large" });
  }

  const chunks = [];
  let received = 0;
  let aborted = false;

  req.on("data", (chunk) => {
    if (aborted) return;
    received += chunk.length;
    if (received > MAX_BYTES) {
      aborted = true;
      res
        .status(413)
        .json({ success: false, message: "Payload too large" });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (aborted) return;
    const raw = Buffer.concat(chunks).toString("utf8");
    req.rawBody = raw;
    try {
      req.body = raw.length > 0 ? JSON.parse(raw) : {};
    } catch {
      req.body = {};
    }
    next();
  });

  req.on("error", (err) => {
    if (aborted) return;
    aborted = true;
    console.error("Monnify webhook: stream error", { error: err.message });
    if (!res.headersSent) {
      res.status(400).json({ success: false, message: "Invalid request stream" });
    }
  });

  req.on("aborted", () => {
    aborted = true;
    console.warn("Monnify webhook: request aborted by client");
  });
}

router.post("/monnify", captureRawBody, handleMonnifyWebhook);

export default router;