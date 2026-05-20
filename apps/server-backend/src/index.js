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
  requireRequestProcessor,
  submitSignup,
  updatePersonnel,
} from "./auth.js";
import {
  aiRequest,
  getRecommendationsFromDb,
  inferPoskoCommodities,
  normalizeAiAnomalyListResponse,
  normalizeAiDashboardResponse,
  normalizeAiListResponse,
  normalizeAiNeedResponse,
  normalizeAiRecommendationResponse,
  syncAiDashboard,
} from "./ai.js";
import { config } from "./config.js";
import { bootstrapDatabase, checkCouchHealth, findDocuments, getDocument, putDocument } from "./couchdb.js";
import {
  getDashboardNotifications,
  getDashboardOverview,
  getDashboardRegionalHeatmap,
  getDashboardStockWeight,
  getDashboardVulnerableFulfillment,
  searchDashboard,
} from "./dashboard.js";
import { startDistributionSyncMarker } from "./distribution-sync.js";
import { ingestStockReading, startMqttIngestion } from "./mqtt.js";
import { createPosko, importPoskosFromCsv, listPoskos, updatePosko } from "./poskos.js";
import {
  completeRequest,
  createRequest,
  getRequestById,
  listRequests,
  patchRequest,
  processRequest,
} from "./requests.js";
import {
  changePassword,
  getSettings,
  updateNotificationSettings,
  updateProfile,
  uploadAvatar,
} from "./settings.js";
import { addStock, deleteAsset, getStockCategories, getStockSummary, getStockTrend, updateAsset } from "./stocks.js";
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

app.post("/api/auth/login", async (req, res, next) => {
  try {
    res.json(await loginUser(req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const result = await submitSignup(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/poskos/:id", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await updatePosko(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

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

app.patch(
  "/api/personnel/:id",
  authenticateRequest,
  requireAdmin,
  async (req, res, next) => {
    try {
      res.json(await updatePersonnel(req.params.id, req.body || {}, req.auth));
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
    if (req.user?.user_id) {
      try {
        const userDoc = await getDocument(req.user.user_id);
        if (userDoc && !userDoc.posko_id) {
          userDoc.posko_id = result.posko._id;
          userDoc.updated_at = new Date().toISOString();
          await putDocument(userDoc);
        }
      } catch (docErr) {
        console.warn("Could not update user posko_id:", docErr.message);
      }
    }
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

app.patch("/api/stocks/:id", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await updateAsset(req.params.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/stocks/:id", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await deleteAsset(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/overview", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getDashboardOverview());
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/stock-weight", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await getDashboardStockWeight(req.query));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/regional-heatmap", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await getDashboardRegionalHeatmap(req.query));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/vulnerable-fulfillment", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getDashboardVulnerableFulfillment());
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/search", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await searchDashboard(req.query));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/notifications", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getDashboardNotifications());
  } catch (error) {
    next(error);
  }
});

app.get("/api/settings", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await getSettings(req.auth));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/settings/profile", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await updateProfile(req.auth, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/password", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await changePassword(req.auth, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/settings/notifications", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await updateNotificationSettings(req.auth, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/settings/avatar",
  authenticateRequest,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      res.json(await uploadAvatar(req.auth, req.file));
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/requests", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await listRequests(req.query));
  } catch (error) {
    next(error);
  }
});

app.get("/api/requests/:id", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await getRequestById(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/requests", authenticateRequest, async (req, res, next) => {
  try {
    res.status(201).json(await createRequest(req.body || {}, req.auth));
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/requests/:id/process",
  authenticateRequest,
  requireRequestProcessor,
  async (req, res, next) => {
    try {
      res.json(await processRequest(req.params.id, req.auth));
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/requests/:id/complete",
  authenticateRequest,
  requireRequestProcessor,
  async (req, res, next) => {
    try {
      res.json(await completeRequest(req.params.id, req.auth));
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/requests/:id",
  authenticateRequest,
  requireRequestProcessor,
  async (req, res, next) => {
    try {
      res.json(await patchRequest(req.params.id, req.body || {}, req.auth));
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

app.get("/api/stock-readings", authenticateRequest, async (req, res, next) => {
  try {
    const { warehouse_id, commodity, node_id, limit: limitParam } = req.query;
    const selector = { type: "stock_reading" };
    if (warehouse_id) selector.warehouse_id = warehouse_id;
    if (commodity) selector.commodity = commodity;
    if (node_id) selector.node_id = node_id;
    const safeLimit = Math.max(1, Math.min(Number(limitParam) || 50, 500));
    const result = await findDocuments(selector, { limit: safeLimit });
    const docs = (result.docs || []).sort(
      (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );
    res.json({ ok: true, readings: docs });
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

app.get("/api/dashboard/overview", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getDashboardOverview());
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/stock-weight", authenticateRequest, async (req, res, next) => {
  try {
    const { category, commodity, days } = req.query;
    res.json(await getStockWeight({ category, commodity, days }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/regional-heatmap", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await getRegionalHeatmap(req.query.limit));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/vulnerable-fulfillment", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getVulnerableFulfillment());
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/search", authenticateRequest, async (req, res, next) => {
  try {
    res.json(await searchDashboard(req.query.q, req.query.limit));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/notifications", authenticateRequest, async (_req, res, next) => {
  try {
    res.json(await getNotifications());
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

app.get("/api/ai/models/current", async (_req, res, next) => {
  try {
    res.json(await aiRequest("/models/current"));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/infer/need", authenticateRequest, async (req, res, next) => {
  try {
    const result = await aiRequest("/infer/need", { method: "POST", body: req.body });
    res.json(normalizeAiNeedResponse(result));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/infer/recommendation", authenticateRequest, async (req, res, next) => {
  try {
    const result = await aiRequest("/infer/recommendation", { method: "POST", body: req.body });
    res.json(normalizeAiRecommendationResponse(result));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/infer/posko/:poskoId", authenticateRequest, async (req, res, next) => {
  try {
    const result = await inferPoskoCommodities(req.params.poskoId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/dashboard", async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit, 10, 100);
    res.json(normalizeAiDashboardResponse(await aiRequest(`/summary/dashboard?limit=${limit}`)));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/forecasts", async (req, res, next) => {
  try {
    const result = await aiRequest(`/forecasts${queryString(req.query, { defaultLimit: 100, maxLimit: 1000 })}`);
    res.json(normalizeAiListResponse(result));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/recommendations", async (req, res, next) => {
  try {
    const result = await aiRequest(`/recommendations${queryString(req.query, { defaultLimit: 100, maxLimit: 1000 })}`);
    res.json(normalizeAiListResponse(result));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/recommendations/top-critical", async (req, res, next) => {
  try {
    const result = await getRecommendationsFromDb({
      limit: clampLimit(req.query.limit, 25, 100),
      posko_id: req.query.posko_id || "",
      risk_level: req.query.risk_level || "",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/anomalies", async (req, res, next) => {
  try {
    const result = await aiRequest(`/anomalies${queryString(req.query, { defaultLimit: 100, maxLimit: 1000 })}`);
    res.json(normalizeAiAnomalyListResponse(result));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/anomalies/recent", async (req, res, next) => {
  try {
    const result = await aiRequest(`/anomalies/recent${queryString(req.query, { defaultLimit: 25, maxLimit: 100 })}`);
    res.json(normalizeAiAnomalyListResponse(result));
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
    res.json(await syncAiDashboard({ limit: req.query.limit }));
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

function queryString(query, { defaultLimit, maxLimit }) {
  const params = new URLSearchParams();
  params.set("limit", String(clampLimit(query.limit, defaultLimit, maxLimit)));
  for (const [key, value] of Object.entries(query)) {
    if (key === "limit" || value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return `?${params.toString()}`;
}
