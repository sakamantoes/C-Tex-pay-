import test from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";

import { Payment } from "../../models/index.js";
import { requireApiKeyPermission } from "../../middleware/apiKeyPermission.middleware.js";
import {
  getTransactionForMerchant,
  getTransactionSummaryForMerchant,
  listTransactionsForMerchant,
  toTransactionResponse,
} from "../../service/transaction.service.js";
import {
  listTransactionsQuerySchema,
  transactionReferenceParamSchema,
} from "../../validation/transaction.validation.js";

const paymentReference = "CTEXPAY_20261003_0123456789ABCDEF";

test("transaction query validation applies bounded defaults and rejects invalid filters", () => {
  const parsed = listTransactionsQuerySchema.parse({});
  assert.deepEqual(parsed, {
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    direction: "DESC",
  });

  for (const query of [
    { page: "-1" },
    { limit: "101" },
    { minAmount: "-1" },
    { from: "not-a-date" },
    { status: "INVALID" },
    { merchantId: "another-merchant" },
    { from: "2026-10-02T00:00:00.000Z", to: "2026-10-01T00:00:00.000Z" },
  ]) {
    assert.equal(listTransactionsQuerySchema.safeParse(query).success, false);
  }
});

test("transaction detail identifier accepts generated C-TEX payment references", () => {
  assert.equal(
    transactionReferenceParamSchema.safeParse({ paymentReference }).success,
    true,
  );
  assert.equal(
    transactionReferenceParamSchema.safeParse({ paymentReference: "not-a-valid-id" }).success,
    false,
  );
});

test("transaction API-key permission gate distinguishes 401, 403, and allowed access", () => {
  const middleware = requireApiKeyPermission("transactions.read");

  const invoke = (request) => {
    const response = {
      statusCode: 200,
      body: null,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    let continued = false;
    middleware(request, response, () => {
      continued = true;
    });
    return { response, continued };
  };

  assert.equal(invoke({ isApiAuthenticated: false }).response.statusCode, 401);
  assert.equal(
    invoke({ isApiAuthenticated: true, apiKey: { permissions: [] } }).response.statusCode,
    403,
  );
  assert.equal(
    invoke({
      isApiAuthenticated: true,
      apiKey: { permissions: [{ key: "transactions.read" }] },
    }).continued,
    true,
  );
});

test("transaction response is normalized and omits provider and private customer fields", () => {
  const response = toTransactionResponse({
    id: "payment-id",
    merchantId: "merchant-id",
    paymentReference,
    merchantReference: "ORDER-123",
    amount: "200000",
    currency: "NGN",
    status: "SUCCESS",
    paymentMethod: "ACCOUNT_TRANSFER",
    provider: "MONNIFY",
    providerReference: "monnify-private-reference",
    providerMetadata: { rawResponse: "private" },
    customer: {
      id: "customer-id",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "08000000000",
      passwordHash: "must-not-leak",
      metadata: { private: true },
    },
  });

  assert.equal(response.amount, 200000);
  assert.equal(response.customer.name, "John Doe");
  assert.equal(response.customer.phone, "08000000000");
  assert.equal("providerReference" in response, false);
  assert.equal("providerMetadata" in response, false);
  assert.equal("passwordHash" in response.customer, false);
  assert.equal(JSON.stringify(response).includes("MONNIFY"), false);
});

test("transaction list queries remain merchant-scoped with safe filters and bounded pagination", async () => {
  const originalFindAndCountAll = Payment.findAndCountAll;
  let options;
  Payment.findAndCountAll = async (queryOptions) => {
    options = queryOptions;
    return { count: 0, rows: [] };
  };

  try {
    const query = listTransactionsQuerySchema.parse({
      page: "2",
      limit: "10",
      status: "SUCCESS",
      paymentMethod: "ACCOUNT_TRANSFER",
      merchantReference: "ORDER_%",
      currency: "NGN",
      minAmount: "100000",
      maxAmount: "500000",
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-03T23:59:59.999Z",
    });
    const result = await listTransactionsForMerchant({ merchantId: "merchant-a", query });

    assert.deepEqual(result.meta, { page: 2, limit: 10, total: 0, totalPages: 0 });
    assert.equal(options.where.merchantId, "merchant-a");
    assert.equal(options.where.status, "SUCCESS");
    assert.equal(options.where.paymentMethod, "ACCOUNT_TRANSFER");
    assert.equal(options.where.currency, "NGN");
    assert.equal(options.where.amount[Op.gte], 100000);
    assert.equal(options.where.amount[Op.lte], 500000);
    assert.equal(options.limit, 10);
    assert.equal(options.offset, 10);
    assert.deepEqual(options.order, [["createdAt", "DESC"], ["id", "ASC"]]);
    assert.deepEqual(options.include[0].attributes, ["id", "firstName", "lastName", "email", "phone"]);
    assert.equal(options.include[0].where.merchantId, "merchant-a");
    assert.match(options.where.merchantReference[Op.like], /\\_/);
    assert.match(options.where.merchantReference[Op.like], /\\%/);
  } finally {
    Payment.findAndCountAll = originalFindAndCountAll;
  }
});

test("transaction detail lookup scopes exact payment reference to authenticated merchant", async () => {
  const originalFindOne = Payment.findOne;
  let options;
  Payment.findOne = async (queryOptions) => {
    options = queryOptions;
    return null;
  };

  try {
    const result = await getTransactionForMerchant({
      merchantId: "merchant-a",
      paymentReference,
    });

    assert.equal(result, null);
    assert.deepEqual(options.where, {
      merchantId: "merchant-a",
      paymentReference,
    });
    assert.equal(options.include[0].where.merchantId, "merchant-a");
  } finally {
    Payment.findOne = originalFindOne;
  }
});

test("transaction summary sums successful money only within the merchant", async () => {
  const originalCount = Payment.count;
  const originalSum = Payment.sum;
  const countQueries = [];
  let sumQuery;
  Payment.count = async (options) => {
    countQueries.push(options);
    return options.where.status === "SUCCESS" ? 3 : 8;
  };
  Payment.sum = async (field, options) => {
    sumQuery = { field, options };
    return "2500000";
  };

  try {
    const summary = await getTransactionSummaryForMerchant({ merchantId: "merchant-a" });

    assert.deepEqual(summary, {
      currency: "NGN",
      totalTransactions: 8,
      successfulTransactions: 3,
      successfulVolumeMinor: "2500000",
    });
    assert.deepEqual(countQueries[0].where, { merchantId: "merchant-a" });
    assert.deepEqual(countQueries[1].where, { merchantId: "merchant-a", status: "SUCCESS" });
    assert.equal(sumQuery.field, "amount");
    assert.deepEqual(sumQuery.options.where, { merchantId: "merchant-a", status: "SUCCESS" });
  } finally {
    Payment.count = originalCount;
    Payment.sum = originalSum;
  }
});
