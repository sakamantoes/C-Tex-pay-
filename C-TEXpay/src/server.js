import { createServer } from "node:http";

import app from "./app.js";
import sequelize from "./config/database.js";
import envConfig from "./config/constant.js";
import { seedPermissions } from "./seeders/2024XXXXXX-permissions.js";
import feePermissionSeed from "./seeders/20261003-fee-permissions.js";
import ledgerPermissionSeed from "./seeders/20261005-ledger-permissions.js";
import payoutPermissionSeed from "./seeders/20261005-payout-permissions.js";
import reconciliationPermissionSeed from "./seeders/20261006-reconciliation-permissions.js";
import { initializeSocketServer } from "./realtime/socket.js";
import {
  startMerchantNotificationWorker,
  stopMerchantNotificationWorker,
} from "./service/merchantNotification.service.js";
import {
  startPaymentExpiryWorker,
  stopPaymentExpiryWorker,
} from "./jobs/paymentExpiry.job.js";

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

const REQUIRED_ENV = ["JWT_ACCESS_SECRET", "DB_NAME", "DB_USER", "DB_HOST"];

const REQUIRED_PROVIDER_ENV = [
  "MONNIFY_BASE_URL",
  "MONNIFY_API_KEY",
  "MONNIFY_SECRET_KEY",
  "MONNIFY_CONTRACT_CODE",
];

function assertRequiredEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  const activeProvider = (
    envConfig.PAYMENT_PROVIDER || "MONNIFY"
  ).toUpperCase();
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
      logging: false,
    });
    // eslint-disable-next-line no-console
    console.log("[startup] Database synchronized");

    /*
    |----------------------------------------------------------------------
    | 4. Idempotent permission seed (retroactive, safe to re-run)
    |----------------------------------------------------------------------
    */
    const permissionSeed = await seedPermissions();
    await feePermissionSeed.seed();
    await ledgerPermissionSeed.seed();
    await payoutPermissionSeed.seed();
    await reconciliationPermissionSeed.seed();
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

    /*
    |----------------------------------------------------------------------
    | 7. Background workers
    |----------------------------------------------------------------------
    | Both workers are idempotent and safe to run on every boot.
    |
    |   Merchant notification worker : drains pending email deliveries
    |   Payment expiry worker        : moves PENDING → EXPIRED after expiry
    |
    | They must run AFTER the HTTP server is bound so a fast restart
    | cannot interrupt an in-flight worker before the socket is up.
    */
    startMerchantNotificationWorker();
    startPaymentExpiryWorker(5 * 60 * 1000);

    // eslint-disable-next-line no-console
    console.log("[startup] Background workers started");
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
    await stopMerchantNotificationWorker();
    // eslint-disable-next-line no-console
    console.log("[shutdown] Merchant notification worker stopped");

    await stopPaymentExpiryWorker();
    // eslint-disable-next-line no-console
    console.log("[shutdown] Payment expiry worker stopped");

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