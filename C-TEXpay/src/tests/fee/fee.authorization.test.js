import test from "node:test";
import assert from "node:assert/strict";
import { requirePlatformRole } from "../../middleware/platformRole.middleware.js";

test("platform fee admin roles allow only ADMIN and SUPER_ADMIN", () => {
  const middleware = requirePlatformRole("ADMIN", "SUPER_ADMIN");

  const invoke = (role) => {
    const response = {
      statusCode: 200,
      body: null,
      status(statusCode) { this.statusCode = statusCode; return this; },
      json(body) { this.body = body; return this; },
    };
    let continued = false;
    middleware({ user: { role } }, response, () => { continued = true; });
    return { response, continued };
  };

  assert.equal(invoke("USER").response.statusCode, 403);
  assert.equal(invoke("MERCHANT").response.statusCode, 403);
  assert.equal(invoke("ADMIN").continued, true);
  assert.equal(invoke("SUPER_ADMIN").continued, true);
});
