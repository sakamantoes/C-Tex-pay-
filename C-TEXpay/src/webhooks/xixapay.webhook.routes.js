import { Router } from "express";
import { handleXixapayWebhook } from "./xixapay.webhook.controller.js";

const router = Router();

/**
 * POST /api/v1/webhooks/xixapay
 *
 * Raw-body capture is required for HMAC-SHA256 signature verification.
 * This route is mounted BEFORE express.json() in app.js.
 */
router.post(
  "/xixapay",
  (req, res, next) => {
    const chunks = [];
    let received = 0;
    const MAX = 256 * 1024;
    let aborted = false;

    req.on("data", (chunk) => {
      if (aborted) return;
      received += chunk.length;
      if (received > MAX) {
        aborted = true;
        res.status(413).json({ success: false, message: "Payload too large" });
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
      console.error("Xixapay webhook: stream error", { error: err.message });
      if (!res.headersSent) {
        res
          .status(400)
          .json({ success: false, message: "Invalid request stream" });
      }
    });
  },
  handleXixapayWebhook
);

export default router;