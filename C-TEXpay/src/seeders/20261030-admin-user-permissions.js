import { Permission } from "../models/index.js";

const permissions = [
  {
    key: "users.read_all",
    name: "View All Users",
    resource: "users",
    action: "read",
    description: "View any platform user, their role and status",
  },
  {
    key: "users.manage",
    name: "Manage Users",
    resource: "users",
    action: "manage",
    description:
      "Change user status, role, and force-logout (audited actions)",
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