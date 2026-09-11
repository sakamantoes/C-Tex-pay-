import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import merchantRoutes from "./routes/merchant.routes.js";
import roleRoutes from "./routes/role.routes.js";
import merchantMemberRoutes from "./routes/merchantMember.routes.js";
import apiKeyRoutes from "./routes/apiKey.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import { requestId } from "./middleware/requestId.middleware.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use(requestId);

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    console.log(`\n[${req.method}] ${req.originalUrl}`);
    console.log(`Status: ${res.statusCode}`);
    console.log("Response:");
    console.log(JSON.stringify(body, null, 2));
    return originalJson(body);
  };

  next();
});

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/merchants", merchantRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/merchant-members", merchantMemberRoutes);
app.use("/api/v1/api-keys", apiKeyRoutes);
app.use("/api/v1/customers", customerRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "C_TEX_PAY API is running",
  });
});

export default app;