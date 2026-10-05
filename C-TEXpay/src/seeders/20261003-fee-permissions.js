import { Permission } from "../models/index.js";

const permissions = [
  {
    key: "fees.read",
    name: "View Fee Configurations",
    resource: "fees",
    action: "read",
    description: "View fee configurations and effective fees",
  },
  {
    key: "fees.manage",
    name: "Manage Fee Configurations",
    resource: "fees",
    action: "manage",
    description: "Create, update, activate, and deactivate fee configurations",
  },
];

export async function seed() {
  let created = 0;
  for (const perm of permissions) {
    const [, wasCreated] = await Permission.findOrCreate({
      where: { key: perm.key },
      defaults: perm,
    });
    if (wasCreated) created += 1;
  }
  return created;
}

export default { seed };