import test from "node:test";
import assert from "node:assert/strict";
import { Payment, PaymentLink } from "../models/index.js";

test("paymentLinkId remains an optional UUID reference with SET NULL behavior", () => {
  const attribute = Payment.rawAttributes.paymentLinkId;

  assert.ok(attribute);
  assert.equal(attribute.allowNull, true);
  assert.equal(attribute.type.key, "UUID");
  assert.equal(attribute.references.model, "payment_links");
  assert.equal(attribute.references.key, "id");
  assert.equal(attribute.onUpdate, "CASCADE");
  assert.equal(attribute.onDelete, "SET NULL");
});

test("payment-link associations and lookup index use the same foreign key", () => {
  assert.equal(Payment.associations.paymentLink.target, PaymentLink);
  assert.equal(Payment.associations.paymentLink.foreignKey, "paymentLinkId");
  assert.equal(PaymentLink.associations.payments.foreignKey, "paymentLinkId");
  assert.ok(Payment.options.indexes.some((index) =>
    index.name === "payments_payment_link_id" && index.fields.includes("paymentLinkId"),
  ));
});
