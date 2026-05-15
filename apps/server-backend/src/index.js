import cors from "cors";
import express from "express";
import multer from "multer";
import {
  approveSignupRequest,
  authenticateRequest,
  ensureDevAdmin,
  listPersonnelForActor,
  listSignupRequests,
  loginUser,
  rejectSignupRequest,
  requireAdmin,
  requirePersonnelViewer,
  submitSignup,
} from "./auth.js";
import { aiRequest, syncAiDashboard } from "./ai.js";
import { config } from "./config.js";
import { bootstrapDatabase, checkCouchHealth, putDocument } from "./couchdb.js";
import { startDistributionSyncMarker } from "./distribution-sync.js";
import { ingestStockReading, startMqttIngestion } from "./mqtt.js";
import { createPosko, importPoskosFromCsv, listPoskos } from "./poskos.js";
import { addStock, getStockCategories, getStockSummary, getStockTrend } from "./stocks.js";
import {
  createAuditLogDoc,
  validateLogShieldDocument,
  ValidationError,
} from "./document-schema.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "logshield-backend",
    port: config.port,
    database: config.couchDbName,
    ai_engine: config.aiEngineUrl,
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

app.get("/api/ai/summary", async (_req, res, next) => {
  try {
    res.json(await aiRequest("/summary"));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/dashboard", async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit, 10, 100);
    res.json(await aiRequest(`/summary/dashboard?limit=${limit}`));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/recommendations/top-critical", async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit, 25, 100);
    res.json(await aiRequest(`/recommendations/top-critical?limit=${limit}`));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/anomalies/recent", async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit, 25, 100);
    res.json(await aiRequest(`/anomalies/recent?limit=${limit}`));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/refresh", authenticateRequest, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await aiRequest("/refresh", { method: "POST" }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/sync", authenticateRequest, requireAdmin, async (req, res, next) => {
  try {
    const limit = clampLimit(req.body?.limit, 50, 100);
    res.status(201).json(await syncAiDashboard({ limit }));
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
  "/api/personnel",
  authenticateRequest,
  requirePersonnelViewer,
  async (req, res, next) => {
    try {
      res.json(await listPersonnelForActor(req.auth));
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/personnel/requests/:id/approve",
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
  "/api/personnel/requests/:id/reject",
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

app.get("/api/poskos", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await listPoskos());
  } catch (error) {
    next(error);
  }
});

app.post("/api/poskos", authenticateRequest, async (req, res, next) => {
  try {
    const result = await createPosko(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/poskos/import-csv",
  authenticateRequest,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const result = await importPoskosFromCsv(req.file?.buffer);
      res.status(result.failed > 0 ? 207 : 201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/stocks/summary", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getStockSummary());
  } catch (error) {
    next(error);
  }
});

app.get("/api/stocks/categories", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getStockCategories());
  } catch (error) {
    next(error);
  }
});

app.get("/api/stocks/trend", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await getStockTrend(req.query.days));
  } catch (error) {
    next(error);
  }
});

app.post("/api/stocks", authenticateRequest, async (req, res, next) => {
  try {
    const result = await addStock(req.body || {}, req.auth);
    res.status(201).json(result);
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

function clampLimit(value, defaultValue, maxValue) {
  const parsed = Number(value || defaultValue);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.min(Math.trunc(parsed), maxValue);
}
