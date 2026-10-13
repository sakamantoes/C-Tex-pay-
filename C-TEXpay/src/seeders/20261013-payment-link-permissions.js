import { Permission } from "../models/index.js";

const permissions = [
  {
    key: "payment_links.read",
    name: "View Payment Links",
    resource: "payment_links",
    action: "read",
    description: "View and list Payment Links",
  },
  {
    key: "payment_links.create",
    name: "Create Payment Links",
    resource: "payment_links",
    action: "create",
    description: "Create new Payment Links",
  },
  {
    key: "payment_links.update",
    name: "Update Payment Links",
    resource: "payment_links",
    action: "update",
    description: "Update existing Payment Links",
  },
  {
    key: "payment_links.delete",
    name: "Delete Payment Links",
    resource: "payment_links",
    action: "delete",
    description: "Archive or deactivate Payment Links",
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