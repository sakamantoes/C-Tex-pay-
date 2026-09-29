/*
|--------------------------------------------------------------------------
| Raw body capture for webhook signature verification
|--------------------------------------------------------------------------
| Monnify signs the raw request body. We need the exact bytes,
| not a re-serialized version of req.body.
|
| This middleware captures the raw body into req.rawBody before
| the JSON parser runs. It only activates on webhook routes.
*/

export function captureRawBody(req, res, next) {
  if (
    req.originalUrl.includes("/webhooks/") &&
    req.method === "POST"
  ) {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      req.rawBody = data;
      // Parse JSON for downstream handlers
      try {
        req.body = JSON.parse(data);
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
}