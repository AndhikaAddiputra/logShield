import express from "express";
import cors from "cors";
import { loginWithDummyUser } from "./auth.js";
import { config } from "./config.js";
import { bootstrapDatabase, checkCouchHealth, putDocument } from "./couchdb.js";
import { startDistributionSyncMarker } from "./distribution-sync.js";
import { ingestStockReading, startMqttIngestion } from "./mqtt.js";
import {
  createAuditLogDoc,
  validateLogShieldDocument,
  ValidationError,
} from "./document-schema.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "logshield-backend",
    port: config.port,
    database: config.couchDbName,
  });
});

app.get("/api/couchdb/health", async (_req, res, next) => {
  try {
    const couch = await checkCouchHealth();
    res.json({ ok: true, couchdb: couch });
  } catch (error) {
    next(error);
  }
});

app.post("/api/couchdb/bootstrap", async (_req, res, next) => {
  try {
    const result = await bootstrapDatabase();
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", (req, res, next) => {
  try {
    res.json(loginWithDummyUser(req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents/validate", (req, res, next) => {
  try {
    validateLogShieldDocument(req.body);
    res.json({ ok: true, type: req.body.type, id: req.body._id });
  } catch (error) {
    next(error);
  }
});

app.post("/api/stock-readings", async (req, res, next) => {
  try {
    const result = await ingestStockReading(req.body, req.ip || "http");
    res.status(201).json({
      ok: true,
      ids: {
        stock_reading: result.reading._id,
        asset: result.asset._id,
        audit_log: result.audit_log._id,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/audit-logs", async (req, res, next) => {
  try {
    const doc = createAuditLogDoc({
      ...req.body,
      ip_address: req.body.ip_address || req.ip || "unknown",
    });
    const result = await putDocument(doc);
    res.status(201).json({ ok: true, id: doc._id, rev: result.rev });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.statusCode || (error instanceof ValidationError ? 400 : 500);
  res.status(status).json({
    ok: false,
    error: error.name || "Error",
    message: error.message || "Unexpected server error",
  });
});

app.listen(config.port, () => {
  console.log(`LogShield backend listening on port ${config.port}`);
  startMqttIngestion();
  startDistributionSyncMarker();
});
