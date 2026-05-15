import express from "express";
import cors from "cors";
import {
  approveSignupRequest,
  authenticateRequest,
  ensureDevAdmin,
  listSignupRequests,
  loginUser,
  rejectSignupRequest,
  requireAdmin,
  submitSignup,
} from "./auth.js";
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
    const devAdmin = await ensureDevAdmin();
    result.dev_admin = devAdmin;
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const result = await submitSignup(req.body || {});
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    res.json(await loginUser(req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/admin/signup-requests",
  authenticateRequest,
  requireAdmin,
  async (req, res, next) => {
    try {
      res.json(await listSignupRequests({ status: req.query.status }));
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/admin/signup-requests/:id/approve",
  authenticateRequest,
  requireAdmin,
  async (req, res, next) => {
    try {
      res.json(await approveSignupRequest(req.params.id, req.body || {}, req.auth));
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/admin/signup-requests/:id/reject",
  authenticateRequest,
  requireAdmin,
  async (req, res, next) => {
    try {
      res.json(await rejectSignupRequest(req.params.id, req.body || {}, req.auth));
    } catch (error) {
      next(error);
    }
  }
);

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
