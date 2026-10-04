import sequelize from "../config/database.js";
import { QueryTypes } from "sequelize";
import "../models/index.js";

async function main() {
  console.log("\n=== 1. OWNER roles ===\n");
  const [owners] = await sequelize.query(
    `SELECT id, merchantId, name, isSystemRole FROM roles WHERE name = 'OWNER'`,
    { type: QueryTypes.SELECT }
  );
  console.log(owners);

  console.log("\n=== 2. Payment permissions ===\n");
  const [perms] = await sequelize.query(
    `SELECT id, \`key\`, name FROM permissions WHERE \`key\` LIKE 'payments.%'`,
    { type: QueryTypes.SELECT }
  );
  console.log(perms);

  console.log("\n=== 3. Existing role_permissions for OWNER + payments.* ===\n");
  const [rps] = await sequelize.query(
    `
    SELECT r.id AS role_id, r.merchantId, p.\`key\` AS permission_key
    FROM roles r
    JOIN role_permissions rp ON rp.roleId = r.id
    JOIN permissions p ON p.id = rp.permissionId
    WHERE r.name = 'OWNER' AND p.\`key\` LIKE 'payments.%'
    `,
    { type: QueryTypes.SELECT }
  );
  console.log(rps);

  console.log("\n=== 4. All permissions count ===\n");
  const [count] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM permissions`,
    { type: QueryTypes.SELECT }
  );
  console.log(count);

  await sequelize.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});