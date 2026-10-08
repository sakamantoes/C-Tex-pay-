import { Permission } from "../models/index.js";

const permissions = [
  {
    key: "payouts.create",
    name: "Create Payouts",
    resource: "payouts",
    action: "create",
    description: "Initiate payouts/withdrawals",
  },
  {
    key: "payouts.read",
    name: "View Own Payouts",
    resource: "payouts",
    action: "read",
    description: "View own payouts",
  },
  {
    key: "payouts.read_all",
    name: "View All Payouts",
    resource: "payouts",
    action: "read",
    description: "Platform-wide payout visibility",
  },
  {
    key: "payouts.manage",
    name: "Manage Payouts",
    resource: "payouts",
    action: "manage",
    description: "Admin: refresh, reverse, retry payouts",
  },
];

export async function seed() {
  for (const perm of permissions) {
    await Permission.findOrCreate({
      where: { key: perm.key },
      defaults: perm,
    });
  }
  return permissions.length;
}

export default { seed };