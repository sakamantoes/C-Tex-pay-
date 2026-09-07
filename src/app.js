import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

//routes
app.use("/api/v1/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "C_TEX_PAY API is running",
  });
});

export default app;