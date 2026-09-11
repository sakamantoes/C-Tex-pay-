// src/seeders/2024XXXXXX-permissions.js

import { Permission } from "../models/index.js";

export const permissions = [
  // Merchant
  { key: "merchants.read", name: "View Merchants", resource: "merchants", action: "read" },
  { key: "merchants.update", name: "Update Merchants", resource: "merchants", action: "update" },

  // Team
  { key: "team.read", name: "View Team", resource: "team", action: "read" },
  { key: "team.manage", name: "Manage Team", resource: "team", action: "manage" },

  // Roles
  { key: "roles.read", name: "View Roles", resource: "roles", action: "read" },
  { key: "roles.manage", name: "Manage Roles", resource: "roles", action: "manage" },

  // Transactions
  { key: "transactions.read", name: "View Transactions", resource: "transactions", action: "read" },
  { key: "transactions.create", name: "Create Transactions", resource: "transactions", action: "create" },
  { key: "transactions.update", name: "Update Transactions", resource: "transactions", action: "update" },
  { key: "transactions.refund", name: "Refund Transactions", resource: "transactions", action: "refund" },

  // Customers
  { key: "customers.read", name: "View Customers", resource: "customers", action: "read" },
  { key: "customers.create", name: "Create Customers", resource: "customers", action: "create" },
  { key: "customers.update", name: "Update Customers", resource: "customers", action: "update" },
  { key: "customers.delete", name: "Delete Customers", resource: "customers", action: "delete" },

  // Payouts
  { key: "payouts.read", name: "View Payouts", resource: "payouts", action: "read" },
  { key: "payouts.create", name: "Create Payouts", resource: "payouts", action: "create" },

  // API Keys
  { key: "api_keys.read", name: "View API Keys", resource: "api_keys", action: "read" },
  { key: "api_keys.create", name: "Create API Keys", resource: "api_keys", action: "create" },
  { key: "api_keys.revoke", name: "Revoke API Keys", resource: "api_keys", action: "revoke" },

  // Webhooks
  { key: "webhooks.read", name: "View Webhooks", resource: "webhooks", action: "read" },
  { key: "webhooks.manage", name: "Manage Webhooks", resource: "webhooks", action: "manage" },

  // Reports
  { key: "reports.read", name: "View Reports", resource: "reports", action: "read" },

  // Settings
  { key: "settings.read", name: "View Settings", resource: "settings", action: "read" },
  { key: "settings.update", name: "Update Settings", resource: "settings", action: "update" },
];

export async function seedPermissions() {
  const existingCount = await Permission.count();

  if (existingCount > 0) {
    return {
      inserted: 0,
      total: existingCount,
      message: "Permissions already exist. Seed skipped.",
    };
  }

  let inserted = 0;

  for (const permission of permissions) {
    const [record, created] = await Permission.findOrCreate({
      where: { key: permission.key },
      defaults: permission,
    });

    if (created) {
      inserted += 1;
    }
  }

  const total = await Permission.count();

  return {
    inserted,
    total,
    message: "Permissions seeded successfully.",
  };
}

export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert("permissions", permissions);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete("permissions", null, {});
}