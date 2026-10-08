import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import merchantRoutes from "./routes/merchant.routes.js";
import roleRoutes from "./routes/role.routes.js";
import permissionRoutes from "./routes/permission.routes.js";
import merchantMemberRoutes from "./routes/merchantMember.routes.js";
import apiKeyRoutes from "./routes/apiKey.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import { requestId } from "./middleware/requestId.middleware.js";
import announcementRoutes from "./routes/announcement.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import adminPaymentRoutes from "./routes/adminPayment.routes.js";
import merchantWebhookRoutes from "./routes/merchantWebhook.routes.js";
import merchantSettingRoutes from "./routes/merchantSetting.routes.js";
import webhookRoutes from "./webhooks/monnify.webhook.routes.js";
import feeRoutes from "./routes/fee.routes.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import ledgerRoutes from "./routes/ledger.routes.js";
import adminLedgerRoutes from "./routes/adminLedger.routes.js";
import payoutRoutes from "./routes/payout.routes.js";
import adminPayoutRoutes from "./routes/adminPayout.routes.js";
import reconciliationRoutes from "./routes/reconciliation.routes.js";

const app = express();

// Webhooks MUST be mounted BEFORE express.json() so their raw body
// is preserved for signature verification.
app.use("/api/v1/webhooks", webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:5173", "https://ctexpay.vercel.app"],
    credentials: true,
  }),
);

app.use(requestId);

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    console.info("HTTP response", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      requestId: req.requestId,
    });
    return originalJson(body);
  };

  next();
});

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/merchants", merchantRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/permissions", permissionRoutes);
app.use("/api/v1/merchant-members", merchantMemberRoutes);
app.use("/api/v1/api-keys", apiKeyRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/admin", announcementRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/merchant-webhooks", merchantWebhookRoutes);
app.use("/api/v1/merchant-settings", merchantSettingRoutes);
app.use("/api/v1/admin/payments", adminPaymentRoutes);
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);
app.use("/api/v1/fees", feeRoutes);
app.use("/api/v1/ledger", ledgerRoutes);
app.use("/api/v1/admin/ledger", adminLedgerRoutes);
app.use("/api/v1/payouts", payoutRoutes);
app.use("/api/v1/admin/payouts", adminPayoutRoutes);
app.use("/api/v1/admin/reconciliations", reconciliationRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "C_TEX_PAY API is running",
  });
});

export default app;
