import test from "node:test";
import assert from "node:assert/strict";
import { requirePlatformRole } from "../../middleware/platformRole.middleware.js";
import { adminMerchantStatusSchema } from "../../validation/admin.validation.js";
import { assertMerchantStatusTransition } from "../../service/adminMerchant.service.js";

test("admin routes reject non-platform users and allow explicit admin roles", () => {
  const middleware = requirePlatformRole("ADMIN", "SUPER_ADMIN");
  const invoke = (role) => {
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let continued = false;
    middleware({ user: { role } }, response, () => { continued = true; });
    return { response, continued };
  };
  assert.equal(invoke("USER").response.statusCode, 403);
  assert.equal(invoke("MERCHANT").response.statusCode, 403);
  assert.equal(invoke("ADMIN").continued, true);
  assert.equal(invoke("SUPER_ADMIN").continued, true);
});

test("merchant status updates require a valid reason and only allow active/suspended transitions", () => {
  assert.equal(adminMerchantStatusSchema.safeParse({ status: "SUSPENDED", reason: "Policy review completed" }).success, true);
  assert.equal(adminMerchantStatusSchema.safeParse({ status: "SUSPENDED", reason: "short" }).success, false);
  assert.equal(adminMerchantStatusSchema.safeParse({ status: "PENDING", reason: "Policy review completed" }).success, false);
  assert.equal(assertMerchantStatusTransition("ACTIVE", "SUSPENDED"), true);
  assert.equal(assertMerchantStatusTransition("SUSPENDED", "ACTIVE"), true);
  assert.equal(assertMerchantStatusTransition("SUSPENDED", "SUSPENDED"), false);
  assert.throws(() => assertMerchantStatusTransition("PENDING", "SUSPENDED"), { statusCode: 409 });
  assert.equal(assertMerchantStatusTransition("ACTIVE", "ACTIVE"), false);
});
