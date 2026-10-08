import { Permission } from "../models/index.js";

const permissions = [
  {
    key: "reconciliation.read",
    name: "View Reconciliation",
    resource: "reconciliation",
    action: "read",
    description: "View reconciliation runs and discrepancies",
  },
  {
    key: "reconciliation.manage",
    name: "Manage Reconciliation",
    resource: "reconciliation",
    action: "manage",
    description: "Start reconciliation runs and resolve discrepancies",
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