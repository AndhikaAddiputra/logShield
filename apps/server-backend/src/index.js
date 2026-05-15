import cors from "cors";
import express from "express";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "log-shield-server-backend",
    couchdb: process.env.COUCHDB_URL ?? null,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.listen(port, () => {
  console.log(`[log-shield] API listening on :${port}`);
});
