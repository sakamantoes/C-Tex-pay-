import { createServer } from "node:http";

import app from "./app.js";
import sequelize from "./config/database.js";
import envConfig from "./config/constant.js";
import { seedPermissions } from "./seeders/2024XXXXXX-permissions.js";
import { initializeSocketServer } from "./realtime/socket.js";

const PORT = Number(envConfig.PORT) || 5000;
const NODE_ENV = envConfig.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

/*
|--------------------------------------------------------------------------
| Required environment configuration
|--------------------------------------------------------------------------
| Fail fast at boot if a critical dependency is missing. Never let the app
| start with undefined credentials — that just moves the crash to a random
| request later, making production incidents much harder to debug.
*/

const REQUIRED_ENV = [
  "JWT_ACCESS_SECRET",
  "DB_NAME",
  "DB_USER",
  "DB_HOST",
];

const REQUIRED_PROVIDER_ENV = [
  "MONNIFY_BASE_URL",
  "MONNIFY_API_KEY",
  "MONNIFY_SECRET_KEY",
  "MONNIFY_CONTRACT_CODE",
];

function assertRequiredEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  const activeProvider = (envConfig.PAYMENT_PROVIDER || "MONNIFY").toUpperCase();
  if (activeProvider === "MONNIFY") {
    const missingProvider = REQUIRED_PROVIDER_ENV.filter(
      (key) => !process.env[key]
    );
    missing.push(...missingProvider);
  }

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[startup] Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| Server lifecycle
|--------------------------------------------------------------------------
*/

let httpServer = null;
let io = null;
let isShuttingDown = false;

async function startServer() {
  try {
    /*
    |----------------------------------------------------------------------
    | 1. Fail fast on missing config
    |----------------------------------------------------------------------
    */
    assertRequiredEnv();

    /*
    |----------------------------------------------------------------------
    | 2. Database connectivity
    |----------------------------------------------------------------------
    */
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log("[startup] MySQL connection established");

    /*
    |----------------------------------------------------------------------
    | 3. Schema sync
    |----------------------------------------------------------------------
    | alter:true is intentionally disabled in production. In production,
    | schema changes must go through migrations, never through sync().
    */
    await sequelize.sync({
      alter: !IS_PRODUCTION,
      logging: false,
    });
    // eslint-disable-next-line no-console
    console.log("[startup] Database synchronized");

    /*
    |----------------------------------------------------------------------
    | 4. Idempotent permission seed (retroactive, safe to re-run)
    |----------------------------------------------------------------------
    | This seeds the permissions table AND grants any missing permissions
    | to existing OWNER roles. It is safe to run on every boot.
    */
    const permissionSeed = await seedPermissions();
    // eslint-disable-next-line no-console
    console.log("[startup] Permission seed:", permissionSeed.message, {
      inserted: permissionSeed.inserted,
      alreadyExisted: permissionSeed.alreadyExisted,
      total: permissionSeed.total,
      ownerRolesProcessed: permissionSeed.ownerRolesProcessed,
      grantsAdded: permissionSeed.grantsAdded,
    });

    /*
    |----------------------------------------------------------------------
    | 5. HTTP server + Socket.IO
    |----------------------------------------------------------------------
    */
    httpServer = createServer(app);
    io = initializeSocketServer(httpServer);

    /*
    |----------------------------------------------------------------------
    | 6. Listen
    |----------------------------------------------------------------------
    */
    await new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(PORT, () => {
        httpServer.off("error", reject);
        resolve();
      });
    });

    // eslint-disable-next-line no-console
    console.log(
      `[startup] Server running on http://localhost:${PORT} (env=${NODE_ENV})`
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[startup] Unable to start server:", error);
    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| Graceful shutdown
|--------------------------------------------------------------------------
| Stop accepting new connections, drain in-flight requests, close sockets,
| then close the DB pool. Also covered: SIGINT (Ctrl+C), SIGTERM (Docker,
| PM2, Kubernetes), uncaught exceptions, and unhandled rejections.
*/

async function shutdown(reason, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // eslint-disable-next-line no-console
  console.log(`[shutdown] Received ${reason}. Graceful shutdown starting...`);

  const forceExitTimer = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error("[shutdown] Forced exit after timeout");
    process.exit(1);
  }, 15_000);
  forceExitTimer.unref?.();

  try {
    if (io) {
      await new Promise((resolve) => io.close(resolve));
      // eslint-disable-next-line no-console
      console.log("[shutdown] Socket.IO closed");
    }

    if (httpServer && httpServer.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
      // eslint-disable-next-line no-console
      console.log("[shutdown] HTTP server closed");
    }

    await sequelize.close();
    // eslint-disable-next-line no-console
    console.log("[shutdown] Database connection closed");

    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[shutdown] Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT", 0));
process.on("SIGTERM", () => shutdown("SIGTERM", 0));

process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("[fatal] Uncaught exception:", error);
  shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[fatal] Unhandled rejection:", reason);
  shutdown("unhandledRejection", 1);
});

/*
|--------------------------------------------------------------------------
| Boot
|--------------------------------------------------------------------------
*/

startServer();

export { startServer, shutdown };