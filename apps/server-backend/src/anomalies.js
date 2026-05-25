import { createAnomalyReportDoc, ValidationError } from "./document-schema.js";
import { findDocuments, getDocument, putDocument, putExistingDocument } from "./couchdb.js";

export async function createAnomalyReport(input, actor, now = new Date()) {
  const doc = createAnomalyReportDoc({
    posko_id: input.posko_id,
    commodity: input.commodity,
    severity: input.severity || "medium",
    status: "reported",
    reported_by: actor.user_id,
    description: input.description || "",
    location: input.location || "",
  }, now);
  const result = await putDocument(doc);
  return { ok: true, report: { ...doc, _rev: result.rev } };
}

export async function listAnomalyReports(params = {}) {
  const { posko_id, severity, status, limit = 100 } = params;
  const selector = { type: "anomaly_report" };
  if (posko_id) selector.posko_id = posko_id;
  if (severity) selector.severity = severity;
  if (status) selector.status = status;
  const result = await findDocuments(selector, { limit: Math.min(Number(limit), 500) });
  const docs = (result.docs || []).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return { count: docs.length, rows: docs };
}

export async function getAnomalyReport(id) {
  const doc = await getDocument(id);
  if (doc.type !== "anomaly_report") throw new ValidationError("Not an anomaly report");
  return doc;
}

export async function updateAnomalyReportStatus(id, status, actor, now = new Date()) {
  const valid = ["reported", "investigating", "resolved"];
  if (!valid.includes(status)) throw new ValidationError(`Status must be one of: ${valid.join(", ")}`);
  const doc = await getDocument(id);
  if (doc.type !== "anomaly_report") throw new ValidationError("Not an anomaly report");
  doc.status = status;
  doc.updated_at = now.toISOString();
  if (status === "investigating") doc.investigated_by = actor.user_id;
  if (status === "resolved") doc.resolved_by = actor.user_id;
  const result = await putExistingDocument(doc);
  return { ok: true, report: { ...doc, _rev: result.rev } };
}
