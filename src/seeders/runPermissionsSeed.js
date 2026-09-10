import sequelize from "../config/database.js";
import { seedPermissions } from "./2024XXXXXX-permissions.js";

const run = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    const result = await seedPermissions();
    console.log("Permission seed result:", result);
    process.exit(0);
  } catch (error) {
    console.error("Permission seed failed:", error);
    process.exit(1);
  }
};

run();
