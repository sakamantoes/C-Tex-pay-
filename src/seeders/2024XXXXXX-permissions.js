// src/seeders/2024XXXXXX-permissions.js

import {
  Permission,
  Role,
  RolePermission,
} from "../models/index.js";
import { Op } from "sequelize";

/*
|--------------------------------------------------------------------------
| Master permission catalogue
|--------------------------------------------------------------------------
| Every permission C-TEX PAY recognises. Adding a new key here is all
| that's required — the seeder will insert it on the next boot AND
| retroactively grant it to every existing OWNER role.
|--------------------------------------------------------------------------
*/

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

  // Payments (Stage 6)
  { key: "payments.create", name: "Create Payments", resource: "payments", action: "create" },
  { key: "payments.read", name: "Read Payments", resource: "payments", action: "read" },
  { key: "payments.read_all", name: "Read All Payments", resource: "payments", action: "read" },
];

/*
|--------------------------------------------------------------------------
| Core seeder — idempotent, retroactive
|--------------------------------------------------------------------------
| 1. Insert any missing permissions (findOrCreate per key).
| 2. Grant every permission to every existing OWNER role that doesn't
|    already have it. This fixes merchants created before a permission
|    was added.
|--------------------------------------------------------------------------
*/

export async function seedPermissions() {
  let inserted = 0;
  let alreadyExisted = 0;

  // Step 1: ensure every permission row exists
  for (const permission of permissions) {
    const [, created] = await Permission.findOrCreate({
      where: { key: permission.key },
      defaults: permission,
    });

    if (created) inserted += 1;
    else alreadyExisted += 1;
  }

  const total = await Permission.count();

  // Step 2: retroactively grant all permissions to every OWNER role
  const allPermissions = await Permission.findAll();
  const ownerRoles = await Role.findAll({
    where: { name: "OWNER", isSystemRole: true },
  });

  let grantsAdded = 0;

  for (const role of ownerRoles) {
    const existing = await RolePermission.findAll({
      where: { roleId: role.id },
      attributes: ["permissionId"],
    });
    const existingIds = new Set(existing.map((rp) => rp.permissionId));
    const toAdd = allPermissions.filter((p) => !existingIds.has(p.id));

    if (toAdd.length > 0) {
      await RolePermission.bulkCreate(
        toAdd.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        { ignoreDuplicates: true }
      );
      grantsAdded += toAdd.length;
    }
  }

  return {
    inserted,
    alreadyExisted,
    total,
    ownerRolesProcessed: ownerRoles.length,
    grantsAdded,
    message: `Permissions seeded: +${inserted} new, ${alreadyExisted} existed, ${grantsAdded} grants added to OWNER roles`,
  };
}

/*
|--------------------------------------------------------------------------
| Backward-compat exports
|--------------------------------------------------------------------------
| Some callers use `seed()`. Some use `seedPermissions()`. Both work.
|--------------------------------------------------------------------------
*/

export async function seed() {
  return seedPermissions();
}

export default { seed, seedPermissions, permissions };

/*
|--------------------------------------------------------------------------
| Legacy Sequelize migration interface (kept for compatibility)
|--------------------------------------------------------------------------
| The project uses sequelize.sync(), not migrations, but the file may
| still be invoked as a migration. Keep these harmless.
|--------------------------------------------------------------------------
*/

export async function up(queryInterface) {
  for (const permission of permissions) {
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO permissions (id, \`key\`, name, resource, action, created_at, updated_at)
       VALUES (UUID(), :key, :name, :resource, :action, NOW(), NOW())`,
      {
        replacements: permission,
      }
    );
  }
}

export async function down() {
  // No-op: never destroy the permission catalogue via migration rollback.
}