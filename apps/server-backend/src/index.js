import cors from "cors";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "log-shield-server-backend",
    couchdb: process.env.COUCHDB_URL ?? null,
  });
});

/**
 * JWT-protected routes for coordinator actions will mount here.
 * PouchDB ↔ CouchDB sync from mobile typically hits CouchDB directly;
 * this service can issue tokens or proxy admin operations.
 */
app.listen(port, () => {
  console.log(`[log-shield] API listening on :${port}`);
});
