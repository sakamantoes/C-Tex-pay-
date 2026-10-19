import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  MerchantInvitation,
  MerchantMember,
  MerchantMemberRole,
  Notification,
  User,
} from "../../models/index.js";
import sequelize from "../../config/database.js";
import {
  acceptMemberInvitation,
  previewMemberInvitation,
} from "../../controller/merchantMember.controller.js";

const invoke = async (handler, req) => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler(req, response);
  return response;
};

const validInvitation = () => ({
  id: "invitation-1",
  merchantId: "merchant-1",
  roleId: "role-from-invite",
  email: "invitee@example.com",
  expiresAt: new Date(Date.now() + 60_000),
  acceptedAt: null,
  async update(values) { Object.assign(this, values); },
});

test("public invitation preview hashes the supplied token and returns only invitation details", async () => {
  const originalFindOne = MerchantInvitation.findOne;
  const originalUserFindOne = User.findOne;
  let query;
  MerchantInvitation.findOne = async (options) => {
    query = options;
    return {
      ...validInvitation(),
      merchant: { businessProfile: { businessName: "Example Shop" } },
      role: { name: "Analyst" },
    };
  };
  User.findOne = async () => ({ id: "user-1", status: "ACTIVE", emailVerified: true });
  const rawToken = "invite-secret";
  try {
    const response = await invoke(previewMemberInvitation, { query: { token: rawToken } });
    assert.equal(response.statusCode, 200);
    assert.equal(query.where.token, crypto.createHash("sha256").update(rawToken).digest("hex"));
    assert.deepEqual(Object.keys(response.body.data).sort(), ["email", "expiresAt", "merchantName", "nextStep", "roleName", "status"]);
    assert.equal(response.body.data.status, "PENDING");
    assert.equal(response.body.data.email, "invitee@example.com");
    assert.equal(response.body.data.merchantName, "Example Shop");
    assert.equal(response.body.data.roleName, "Analyst");
    assert.equal(response.body.data.nextStep, "LOGIN");
    assert.equal("accountExists" in response.body.data, false);
  } finally {
    MerchantInvitation.findOne = originalFindOne;
    User.findOne = originalUserFindOne;
  }
});

test("public preview distinguishes expired and already-accepted invitations", async () => {
  const originalFindOne = MerchantInvitation.findOne;
  let invitation = { ...validInvitation(), expiresAt: new Date(Date.now() - 1) };
  MerchantInvitation.findOne = async () => invitation;
  try {
    const expired = await invoke(previewMemberInvitation, { query: { token: "secret" } });
    assert.equal(expired.statusCode, 410);
    assert.equal(expired.body.code, "INVITATION_EXPIRED");

    invitation = { ...validInvitation(), acceptedAt: new Date() };
    const accepted = await invoke(previewMemberInvitation, { query: { token: "secret" } });
    assert.equal(accepted.statusCode, 200);
    assert.deepEqual(accepted.body.data, { status: "ACCEPTED" });
  } finally {
    MerchantInvitation.findOne = originalFindOne;
  }
});

test("public preview rejects an unknown invitation token", async () => {
  const originalFindOne = MerchantInvitation.findOne;
  MerchantInvitation.findOne = async () => null;
  try {
    const response = await invoke(previewMemberInvitation, { query: { token: "not-valid" } });
    assert.equal(response.statusCode, 404);
    assert.equal(response.body.code, "INVITATION_INVALID");
  } finally {
    MerchantInvitation.findOne = originalFindOne;
  }
});

test("preview recommends registration for a new invitee and blocks ineligible accounts", async () => {
  const originals = { invitation: MerchantInvitation.findOne, user: User.findOne };
  MerchantInvitation.findOne = async () => ({
    ...validInvitation(),
    merchant: null,
    role: null,
  });
  try {
    User.findOne = async () => null;
    const newInvitee = await invoke(previewMemberInvitation, { query: { token: "secret" } });
    assert.equal(newInvitee.body.data.nextStep, "REGISTER");

    User.findOne = async () => ({ id: "user-2", status: "SUSPENDED", emailVerified: true });
    const suspended = await invoke(previewMemberInvitation, { query: { token: "secret" } });
    assert.equal(suspended.body.data.nextStep, "ACCOUNT_UNAVAILABLE");
    assert.equal("id" in suspended.body.data, false);
  } finally {
    MerchantInvitation.findOne = originals.invitation;
    User.findOne = originals.user;
  }
});

test("acceptance rejects an authenticated account with the wrong invited email", async () => {
  const originals = {
    transaction: sequelize.transaction,
    findOne: MerchantInvitation.findOne,
  };
  const invitation = validInvitation();
  let accepted = false;
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });
  MerchantInvitation.findOne = async () => invitation;
  try {
    const response = await invoke(acceptMemberInvitation, {
      body: { token: "secret" }, params: {},
      user: { id: "user-1", email: "other@example.com", status: "ACTIVE", emailVerified: true },
    });
    accepted = Boolean(invitation.acceptedAt);
    assert.equal(response.statusCode, 403);
    assert.match(response.body.message, /different email/i);
    assert.equal(accepted, false);
  } finally {
    sequelize.transaction = originals.transaction;
    MerchantInvitation.findOne = originals.findOne;
  }
});

test("acceptance assigns only the invitation role and a repeated request is rejected", async () => {
  const originals = {
    transaction: sequelize.transaction,
    invitationFindOne: MerchantInvitation.findOne,
    memberFindOne: MerchantMember.findOne,
    memberCreate: MerchantMember.create,
    memberRoleFindOrCreate: MerchantMemberRole.findOrCreate,
    notificationFindAll: Notification.findAll,
  };
  const invitation = validInvitation();
  const assignedRoles = [];
  let invitationLock;
  let member;
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });
  MerchantInvitation.findOne = async (options) => { invitationLock = options.lock; return invitation; };
  MerchantMember.findOne = async () => member || null;
  MerchantMember.create = async (values) => (member = { id: "member-1", ...values });
  MerchantMemberRole.findOrCreate = async (values) => { assignedRoles.push(values.where.roleId); return [{}, true]; };
  Notification.findAll = async () => [];
  const req = {
    body: { token: "secret" }, params: {},
    user: { id: "user-1", email: "INVITEE@example.com", status: "ACTIVE", emailVerified: true },
  };
  try {
    const first = await invoke(acceptMemberInvitation, req);
    assert.equal(first.statusCode, 200);
    assert.equal(invitationLock, "UPDATE");
    assert.deepEqual(assignedRoles, ["role-from-invite"]);
    assert.equal(first.body.data.alreadyMember, false);

    const repeat = await invoke(acceptMemberInvitation, req);
    assert.equal(repeat.statusCode, 400);
    assert.equal(assignedRoles.length, 1);
  } finally {
    sequelize.transaction = originals.transaction;
    MerchantInvitation.findOne = originals.invitationFindOne;
    MerchantMember.findOne = originals.memberFindOne;
    MerchantMember.create = originals.memberCreate;
    MerchantMemberRole.findOrCreate = originals.memberRoleFindOrCreate;
    Notification.findAll = originals.notificationFindAll;
  }
});

test("already-active membership is preserved without assigning an invitation role", async () => {
  const originals = {
    transaction: sequelize.transaction,
    invitationFindOne: MerchantInvitation.findOne,
    memberFindOne: MerchantMember.findOne,
    memberRoleFindOrCreate: MerchantMemberRole.findOrCreate,
    notificationFindAll: Notification.findAll,
  };
  const invitation = validInvitation();
  const member = { id: "existing-member", status: "ACTIVE" };
  let assigned = false;
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });
  MerchantInvitation.findOne = async () => invitation;
  MerchantMember.findOne = async () => member;
  MerchantMemberRole.findOrCreate = async () => { assigned = true; };
  Notification.findAll = async () => [];
  try {
    const response = await invoke(acceptMemberInvitation, {
      body: { token: "secret" }, params: {},
      user: { id: "user-1", email: "invitee@example.com", status: "ACTIVE", emailVerified: true },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.alreadyMember, true);
    assert.equal(invitation.acceptedAt instanceof Date, true);
    assert.equal(assigned, false);
  } finally {
    sequelize.transaction = originals.transaction;
    MerchantInvitation.findOne = originals.invitationFindOne;
    MerchantMember.findOne = originals.memberFindOne;
    MerchantMemberRole.findOrCreate = originals.memberRoleFindOrCreate;
    Notification.findAll = originals.notificationFindAll;
  }
});
