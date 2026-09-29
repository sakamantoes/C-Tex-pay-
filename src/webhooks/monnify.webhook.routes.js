import { Router } from "express";
import { handleMonnifyWebhook } from "./monnify.webhook.controller.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Raw-body middleware (scoped to this route)
|--------------------------------------------------------------------------
| Monnify's signature is HMAC-SHA512 over the RAW request body.
| express.json() would already have consumed and parsed the stream,
| so we use express.raw() here scoped to this specific route.
|
| After raw parsing, we JSON.parse() manually so downstream code can
| use req.body as usual, and req.rawBody contains the exact bytes.
*/

router.post(
  "/monnify",
  (req, res, next) => {
    let chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      req.rawBody = raw.toString("utf8");
      try {
        req.body = JSON.parse(req.rawBody || "{}");
      } catch {
        req.body = {};
      }
      next();
    });
    req.on("error", next);
  },
  handleMonnifyWebhook
);

export default router;