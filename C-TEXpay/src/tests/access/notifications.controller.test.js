import test from "node:test";
import assert from "node:assert/strict";

import { Notification } from "../../models/index.js";
import { getMyNotifications } from "../../controller/merchantMember.controller.js";

test("notification list returns exact unread total independent of the recent-list limit", async () => {
  const originalFindAll = Notification.findAll;
  const originalCount = Notification.count;
  const queries = [];
  Notification.findAll = async (options) => {
    queries.push({ type: "list", options });
    return Array.from({ length: 50 }, (_, index) => ({ id: `notification-${index}` }));
  };
  Notification.count = async (options) => {
    queries.push({ type: "count", options });
    return 73;
  };

  const response = {
    statusCode: 200,
    body: null,
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; },
  };

  try {
    await getMyNotifications({ user: { id: "user-1" }, requestId: "request-1" }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.notifications.length, 50);
    assert.equal(response.body.data.unreadCount, 73);
    assert.deepEqual(queries.find((query) => query.type === "count").options.where, {
      userId: "user-1",
      readAt: null,
    });
  } finally {
    Notification.findAll = originalFindAll;
    Notification.count = originalCount;
  }
});
