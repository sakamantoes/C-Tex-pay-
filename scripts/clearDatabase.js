// scripts/clearDatabase.js
//
// Drops and recreates every table by using Sequelize sync({ force: true }).
// Wipes ALL data. Preserves table structure and re-runs seeders afterward.
//
// Usage:
//   node scripts/clearDatabase.js
//
// ⚠️  DESTRUCTIVE. Only run in development.

import sequelize from "../src/config/database.js";
import "../src/models/index.js"; // register models + associations


async function clearDatabase() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Connected.");

    console.log("Dropping and recreating all tables...");
    await sequelize.sync({ force: true });
    console.log("All tables dropped and recreated.");

    console.log("Re-running permission seeds...");

    console.log("\nDone. Database is empty (except seeded permissions).");
    process.exit(0);
  } catch (error) {
    console.error("Failed to clear database:", error);
    process.exit(1);
  }
}

clearDatabase();