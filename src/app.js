import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.json({
    message: "C_TEX_PAY API is running",
  });
});

export default app;