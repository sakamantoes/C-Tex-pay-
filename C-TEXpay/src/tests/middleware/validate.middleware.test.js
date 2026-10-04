import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { validate } from "../../middleware/validate.middleware.js";

test("query validation replaces getter-backed query with transformed values", () => {
  const req = {};
  Object.defineProperty(req, "query", {
    configurable: true,
    get: () => ({ page: "1", limit: "5" }),
  });
  let continued = false;

  validate(
    z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(20),
    }),
    "query",
  )(req, {}, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.deepEqual(req.query, { page: 1, limit: 5 });
});
