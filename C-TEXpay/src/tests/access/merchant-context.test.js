import test from "node:test";
import assert from "node:assert/strict";

import { Merchant, MerchantMember } from "../../models/index.js";
import { getMyMemberships } from "../../controller/merchant.controller.js";
import {
  requireMerchant,
  requireOwnedMerchant,
} from "../../middleware/merchant.middleware.js";

const userId = "10000000-0000-4000-8000-000000000001";
const ownedMerchantId = "20000000-0000-4000-8000-000000000001";
const teamMerchantId = "30000000-0000-4000-8000-000000000001";
const unrelatedMerchantId = "40000000-0000-4000-8000-000000000001";

const ownedMembership = {
  id: "owner-membership",
  merchantId: ownedMerchantId,
  merchant: { id: ownedMerchantId, ownerId: userId, status: "ACTIVE" },
};
const teamMembership = {
  id: "team-membership",
  merchantId: teamMerchantId,
  merchant: { id: teamMerchantId, ownerId: "another-user", status: "ACTIVE" },
};

async function invoke(middleware, request) {
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
  await middleware(request, response, () => {
    continued = true;
  });
  return { request, response, continued };
}

test("requireMerchant selects the explicitly requested active membership", async () => {
  const originalFindAll = MerchantMember.findAll;
  let query;
  MerchantMember.findAll = async (options) => {
    query = options;
    return [ownedMembership, teamMembership];
  };

  try {
    const result = await invoke(requireMerchant, {
      user: { id: userId },
      get: (header) => (header.toLowerCase() === "x-merchant-id" ? teamMerchantId : undefined),
    });

    assert.equal(result.continued, true);
    assert.equal(query.where.status, "ACTIVE");
    assert.equal(result.response.statusCode, 200);
    assert.equal(result.response.body, null);
    assert.equal(result.request.merchant.id, teamMerchantId);

    const defaultResult = await invoke(requireMerchant, {
      user: { id: userId },
      get: () => undefined,
    });
    assert.equal(defaultResult.continued, true);
    assert.equal(defaultResult.request.merchant.id, ownedMerchantId);
  } finally {
    MerchantMember.findAll = originalFindAll;
  }
});

test("requireMerchant rejects unknown workspace IDs and ambiguous implicit selection", async () => {
  const originalFindAll = MerchantMember.findAll;
  MerchantMember.findAll = async () => [ownedMembership, teamMembership];

  try {
    const foreign = await invoke(requireMerchant, {
      user: { id: userId },
      get: () => unrelatedMerchantId,
    });
    assert.equal(foreign.response.statusCode, 403);
    assert.equal(foreign.continued, false);

    const ambiguous = await invoke(requireMerchant, {
      user: { id: "different-user" },
      get: () => undefined,
    });
    assert.equal(ambiguous.response.statusCode, 409);
    assert.equal(ambiguous.continued, false);
  } finally {
    MerchantMember.findAll = originalFindAll;
  }
});

test("requireOwnedMerchant only resolves a merchant owned by the authenticated user", async () => {
  const originalFindOne = Merchant.findOne;
  let query;
  Merchant.findOne = async (options) => {
    query = options;
    return { id: ownedMerchantId, ownerId: userId, status: "ACTIVE" };
  };

  try {
    const result = await invoke(requireOwnedMerchant, { user: { id: userId } });
    assert.equal(result.continued, true);
    assert.deepEqual(query.where, { ownerId: userId, status: "ACTIVE" });
    assert.equal(result.response.statusCode, 200);
  } finally {
    Merchant.findOne = originalFindOne;
  }
});

test("membership discovery returns assigned permissions without merchant profile data", async () => {
  const originalFindAll = MerchantMember.findAll;
  MerchantMember.findAll = async () => [
    {
      id: "team-membership",
      merchantId: teamMerchantId,
      status: "ACTIVE",
      joinedAt: new Date("2026-10-01T00:00:00.000Z"),
      merchant: {
        id: teamMerchantId,
        ownerId: "another-user",
        businessProfile: { businessName: "Private business data" },
      },
      roles: [
        {
          id: "role-1",
          name: "Analyst",
          permissions: [{ key: "transactions.read" }],
        },
      ],
    },
  ];

  try {
    const result = await invoke(getMyMemberships, { user: { id: userId } });
    const memberships = result.response.body.data.memberships;

    assert.equal(result.response.statusCode, 200);
    assert.equal(memberships[0].isOwner, false);
    assert.deepEqual(memberships[0].roles, [{ id: "role-1", name: "Analyst" }]);
    assert.deepEqual(memberships[0].permissions, ["transactions.read"]);
    assert.equal("merchant" in memberships[0], false);
    assert.equal(JSON.stringify(memberships).includes("Private business data"), false);
  } finally {
    MerchantMember.findAll = originalFindAll;
  }
});
