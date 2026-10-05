import { Permission } from "../models/index.js";

const permissions = [
  {
    key: "ledger.read",
    name: "View Own Ledger",
    resource: "ledger",
    action: "read",
    description: "View own merchant ledger and balance",
  },
  {
    key: "ledger.read_all",
    name: "View All Ledgers",
    resource: "ledger",
    action: "read",
    description: "Platform-wide ledger and balance visibility",
  },
  {
    key: "ledger.adjust",
    name: "Adjust Ledgers",
    resource: "ledger",
    action: "manage",
    description: "Post authorized financial adjustments",
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