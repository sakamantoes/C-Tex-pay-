import app from "./app.js";
import sequelize from "./config/database.js";
import envConfig from "./config/constant.js";
import { seedPermissions } from "./seeders/2024XXXXXX-permissions.js";
import { createServer } from "node:http";
import { initializeSocketServer } from "./realtime/socket.js";

const PORT = envConfig.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected successfully");

    await sequelize.sync({
      alter: envConfig.NODE_ENV !== "production",
      logging: false,
    });
    console.log("Database synchronized");

    /* ---------- Single permission seeder (idempotent + retroactive) ---------- */
    const permissionSeed = await seedPermissions();
    console.log("Permission seed:", permissionSeed.message, {
      inserted: permissionSeed.inserted,
      alreadyExisted: permissionSeed.alreadyExisted,
      total: permissionSeed.total,
      ownerRolesProcessed: permissionSeed.ownerRolesProcessed,
      grantsAdded: permissionSeed.grantsAdded,
    });

    const httpServer = createServer(app);
    initializeSocketServer(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();