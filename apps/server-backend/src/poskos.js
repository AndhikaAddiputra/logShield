import { parse } from "csv-parse/sync";
import { bulkDocuments, findDocuments, getDocument, putDocument } from "./couchdb.js";
import { createPoskoDoc, ValidationError } from "./document-schema.js";

const CSV_COLUMNS = [
  "KIB",
  "name",
  "address",
  "district",
  "province",
  "totalpengungsi",
  "countbalita",
  "countlansia",
  "countperempuan",
  "countpria",
  "countdisabilitas",
  "pjphone",
  "pjname",
];

export async function listPoskos() {
  const result = await findDocuments({ type: "posko" }, { limit: 1000 });
  const rows = (result.docs || [])
    .map(toPoskoResponse)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, rows };
}

export async function createPosko(input) {
  const doc = createPoskoDoc(normalizePoskoInput(input));
  const result = await putDocument(doc);
  return { ok: true, posko: toPoskoResponse({ ...doc, _rev: result.rev }) };
}

export async function importPoskosFromCsv(buffer) {
  if (!buffer?.length) {
    throw new ValidationError("CSV file is required");
  }

  let records;
  try {
    records = parse(buffer, {
      columns: (headers) => headers.map((header) => String(header).replace(/^\uFEFF/, "").trim()),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    throw new ValidationError(`CSV could not be parsed: ${error.message}`);
  }

  const docs = [];
  const errors = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    try {
      assertCsvColumns(record, rowNumber);
      docs.push(createPoskoDoc(normalizeCsvRow(record)));
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error.message || "Invalid row",
      });
    }
  });

  let inserted = 0;
  if (docs.length > 0) {
    const result = await bulkDocuments(docs);
    result.forEach((row, index) => {
      if (row.ok) {
        inserted += 1;
      } else {
        errors.push({
          row: docs[index]?._id || "bulk_write",
          message: row.reason || row.error || "Failed to insert row",
        });
      }
    });
  }

  return {
    ok: errors.length === 0,
    inserted,
    failed: records.length - inserted,
    errors,
  };
}

function normalizePoskoInput(input) {
  return normalizeCanonicalFields(input || {});
}

function normalizeCsvRow(row) {
  return normalizeCanonicalFields({
    kib_16: row.KIB,
    name: row.name,
    address: row.address,
    district: row.district,
    province: row.province,
    total_pengungsi: row.totalpengungsi,
    count_balita: row.countbalita,
    count_lansia: row.countlansia,
    count_perempuan: row.countperempuan,
    count_pria: row.countpria,
    count_disabilitas: row.countdisabilitas,
    pj_phone: row.pjphone,
    pj_name: row.pjname,
  });
}

function normalizeCanonicalFields(input) {
  return {
    kib_16: trim(input.kib_16),
    name: trim(input.name),
    address: trim(input.address),
    district: trim(input.district),
    province: trim(input.province),
    total_pengungsi: toNumber(input.total_pengungsi, "total_pengungsi"),
    count_balita: toNumber(input.count_balita, "count_balita"),
    count_lansia: toNumber(input.count_lansia, "count_lansia"),
    count_perempuan: toNumber(input.count_perempuan, "count_perempuan"),
    count_pria: toNumber(input.count_pria, "count_pria"),
    count_disabilitas: toNumber(input.count_disabilitas, "count_disabilitas"),
    pj_phone: trim(input.pj_phone),
    pj_name: trim(input.pj_name),
  };
}

function toPoskoResponse(doc) {
  return {
    _id: doc._id,
    _rev: doc._rev,
    type: doc.type,
    kib_16: doc.kib_16,
    name: doc.name,
    address: doc.address,
    district: doc.district,
    province: doc.province,
    total_pengungsi: doc.total_pengungsi,
    count_balita: doc.count_balita,
    count_lansia: doc.count_lansia,
    count_perempuan: doc.count_perempuan,
    count_pria: doc.count_pria,
    count_disabilitas: doc.count_disabilitas,
    pj_phone: doc.pj_phone,
    pj_name: doc.pj_name,
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function assertCsvColumns(row, rowNumber) {
  const missing = CSV_COLUMNS.filter((column) => !(column in row));
  if (missing.length > 0) {
    throw new ValidationError(`CSV row ${rowNumber} missing columns: ${missing.join(", ")}`);
  }
}

function trim(value) {
  return typeof value === "string" ? value.trim() : value;
}

function toNumber(value, field) {
  const normalized = typeof value === "string" ? value.trim() : value;
  const number = Number(normalized);
  if (normalized === "" || !Number.isFinite(number)) {
    throw new ValidationError(`${field} must be a finite number`);
  }
  return number;
}

export async function updatePosko(id, input) {
  const doc = await getDocument(id);
  if (!doc || doc.type !== "posko") {
    throw new ValidationError("Posko not found");
  }
  const allowedFields = [
    "kib_16", "name", "address", "district", "province",
    "total_pengungsi", "count_balita", "count_lansia",
    "count_perempuan", "count_pria", "count_disabilitas",
    "pj_phone", "pj_name",
  ];
  const updates = {};
  for (const field of allowedFields) {
    if (input[field] !== undefined) {
      updates[field] = input[field];
    }
  }
  const updated = {
    ...doc,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const result = await putDocument(updated);
  return { ok: true, posko: toPoskoResponse({ ...updated, _rev: result.rev }) };
}
