import sequelize from "../config/database.js";
import { QueryTypes } from "sequelize";
import "../models/index.js";

async function main() {
  console.log("Granting payment permissions to all OWNER roles...");

  const [result] = await sequelize.query(
    `
    INSERT INTO role_permissions (id, roleId, permissionId, createdAt, updatedAt)
    SELECT UUID(), r.id, p.id, NOW(), NOW()
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'OWNER'
      AND r.isSystemRole = 1
      AND p.key IN ('payments.create','payments.read','payments.read_all')
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.roleId = r.id AND rp.permissionId = p.id
      )
    `,
    { type: QueryTypes.INSERT }
  );

  console.log("Done. Rows inserted:", result);
  await sequelize.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});