import sequelize from "../config/database.js";
import { QueryTypes } from "sequelize";
import crypto from "crypto";
import "../models/index.js";

const MISSING = [
  {
    key: "payments.read",
    name: "Read Payments",
    resource: "payments",
    action: "read",
    description: "View payments belonging to the authenticated merchant",
  },
  {
    key: "payments.read_all",
    name: "Read All Payments",
    resource: "payments",
    action: "read",
    description:
      "Platform-wide payment visibility for authorized administrators",
  },
];

async function main() {
  for (const perm of MISSING) {
    const [existing] = await sequelize.query(
      "SELECT id FROM permissions WHERE `key` = :key",
      { replacements: { key: perm.key }, type: QueryTypes.SELECT }
    );

    if (existing) {
      console.log(`Already exists: ${perm.key}`);
      continue;
    }

    const id = crypto.randomUUID();
    await sequelize.query(
      `
      INSERT INTO permissions (id, \`key\`, name, resource, action, description, createdAt, updatedAt)
      VALUES (:id, :key, :name, :resource, :action, :description, NOW(), NOW())
      `,
      {
        replacements: {
          id,
          key: perm.key,
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
        },
      }
    );
    console.log(`Inserted: ${perm.key} (${id})`);
  }

  const [all] = await sequelize.query(
    "SELECT `key` FROM permissions WHERE `key` LIKE 'payments.%' ORDER BY `key`",
    { type: QueryTypes.SELECT }
  );
  console.log("\nCurrent payments.* permissions:", all);

  await sequelize.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});