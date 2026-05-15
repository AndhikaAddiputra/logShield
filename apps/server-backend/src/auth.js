import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import {
  bulkDocuments,
  ensureCouchUser,
  findDocuments,
  getDocument,
  putDocument,
  putExistingDocument,
} from "./couchdb.js";
import {
  validateApprovalInput,
  validateLogShieldDocument,
  validateSignupInput,
} from "./document-schema.js";

const AES_ALGO = "aes-256-gcm";

export async function submitSignup(input, now = new Date()) {
  validateSignupInput(input);
  const email = normalizeEmail(input.email);
  const nikLookupHash = hashNik(input.nik);

  await assertNoExistingAccount(email, nikLookupHash);

  const doc = {
    _id: `signup_request::${randomUUID()}`,
    type: "signup_request",
    email,
    name: input.name.trim(),
    nik: encryptSecret(input.nik),
    nik_lookup_hash: nikLookupHash,
    phone: input.phone.trim(),
    ...(input.avatar_url ? { avatar_url: input.avatar_url } : {}),
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    password_hash: await bcrypt.hash(input.password, 12),
  };

  validateSignupRequestForWrite(doc);
  await putDocument(doc);

  return {
    ok: true,
    id: doc._id,
    status: "pending",
    message: "Registration submitted for admin review.",
  };
}

export async function loginUser({ identifier, password }) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier || !password) {
    throw new AuthError("Invalid credentials");
  }

  const credential = await findCredentialByIdentifier(normalizedIdentifier);
  if (!credential) {
    const pending = await findSignupByIdentifier(normalizedIdentifier);
    if (pending?.status === "pending") throw new AuthError("Account is pending admin review", 403);
    if (pending?.status === "rejected") throw new AuthError("Registration was rejected", 403);
    throw new AuthError("Invalid credentials");
  }

  if (credential.status !== "active") {
    throw new AuthError("Account is inactive", 403);
  }

  const passwordOk = await bcrypt.compare(password, credential.password_hash);
  if (!passwordOk) {
    throw new AuthError("Invalid credentials");
  }

  const user = await getDocument(credential.user_id);
  const token = signUserToken(user);

  return {
    ok: true,
    token,
    user: sanitizeUser(user),
    couchdb: {
      url: `${config.couchUrl}/${config.couchDbName}`,
      username: credential.couch_username,
      password: decryptSecret(credential.couch_password_enc),
      database: config.couchDbName,
    },
  };
}

export async function listSignupRequests({ status } = {}) {
  const selector = { type: "signup_request" };
  if (status) selector.status = status;
  const result = await findDocuments(selector, { limit: 100 });
  return {
    ok: true,
    requests: (result.docs || []).map(sanitizeSignupRequest),
  };
}

export async function listPersonnelForActor(actor) {
  const viewer = await getDocument(actor.user_id);
  if (!["admin", "koordinator"].includes(viewer.role)) {
    throw new AuthError("Admin or koordinator role required", 403);
  }

  const usersResult = await findDocuments({ type: "user" }, { limit: 200 });
  const currentPersonnel = (usersResult.docs || [])
    .filter((user) => canViewPersonnel(viewer, user))
    .map((user) => personnelRowFromUser(user, viewer));

  const rows = [...currentPersonnel];
  if (viewer.role === "admin") {
    const signupResult = await findDocuments(
      { type: "signup_request", status: "pending" },
      { limit: 200 }
    );
    rows.push(...(signupResult.docs || []).map((request) => personnelRowFromSignupRequest(request, viewer)));
  }

  rows.sort((a, b) => a.nama_personel.localeCompare(b.nama_personel));

  return {
    ok: true,
    viewer: {
      user_id: viewer._id,
      role: viewer.role,
      posko_id: viewer.posko_id,
    },
    columns: viewer.role === "admin"
      ? ["Nama Personel", "KIB (Bencana ID)", "NIK", "Role", "Posko Assignment", "Aksi"]
      : ["Nama Personel", "KIB (Bencana ID)", "Role", "Posko Assignment", "Aksi"],
    rows,
  };
}

export async function approveSignupRequest(id, input, actor, now = new Date()) {
  validateApprovalInput(input);
  const request = await getDocument(id);
  if (request.type !== "signup_request") throw new AuthError("Signup request not found", 404);
  if (request.status !== "pending") throw new AuthError("Signup request has already been reviewed", 409);

  const userId = `user::${randomUUID()}`;
  const email = input.email ? normalizeEmail(input.email) : request.email;
  const couchPassword = randomBytes(24).toString("base64url");
  const couchUsername = email;

  const user = {
    _id: userId,
    type: "user",
    email,
    name: input.name?.trim() || request.name,
    nik: request.nik,
    kib_bencana_id: input.kib_bencana_id,
    role: input.role,
    posko_id: input.posko_id ?? null,
    phone: input.phone?.trim() || request.phone,
    ...(input.avatar_url || request.avatar_url ? { avatar_url: input.avatar_url || request.avatar_url } : {}),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const credential = {
    _id: `auth_credential::${userId}`,
    type: "auth_credential",
    user_id: userId,
    email,
    nik: request.nik,
    nik_lookup_hash: request.nik_lookup_hash,
    password_hash: request.password_hash,
    status: "active",
    couch_username: couchUsername,
    couch_password_enc: encryptSecret(couchPassword),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const reviewedRequest = {
    ...request,
    status: "approved",
    reviewed_by: actor.user_id,
    reviewed_at: now.toISOString(),
    rejection_reason: null,
    updated_at: now.toISOString(),
  };
  delete reviewedRequest.password_hash;

  const emailDoc = createEmailOutbox({
    to: email,
    subject: "LogShield account approved",
    body: `Hello ${user.name}, your LogShield account has been approved. You can now log in with your email or NIK.`,
    related_signup_id: request._id,
    related_user_id: userId,
  }, now);

  validateLogShieldDocument(user);
  validateLogShieldDocument(credential);
  validateSignupRequestForWrite(reviewedRequest);
  validateLogShieldDocument(emailDoc);

  await ensureCouchUser({
    username: couchUsername,
    password: couchPassword,
    roles: [config.devLogin.couchRole],
  });
  await bulkDocuments([user, credential, reviewedRequest, emailDoc]);

  return {
    ok: true,
    user: sanitizeUser(user),
    signup_request: sanitizeSignupRequest(reviewedRequest),
    email_outbox: emailDoc._id,
  };
}

export async function rejectSignupRequest(id, { reason }, actor, now = new Date()) {
  const request = await getDocument(id);
  if (request.type !== "signup_request") throw new AuthError("Signup request not found", 404);
  if (request.status !== "pending") throw new AuthError("Signup request has already been reviewed", 409);

  const reviewedRequest = {
    ...request,
    status: "rejected",
    reviewed_by: actor.user_id,
    reviewed_at: now.toISOString(),
    rejection_reason: reason || "Rejected by admin.",
    updated_at: now.toISOString(),
  };
  delete reviewedRequest.password_hash;

  const emailDoc = createEmailOutbox({
    to: request.email,
    subject: "LogShield registration rejected",
    body: `Hello ${request.name}, your LogShield registration was rejected. Reason: ${reviewedRequest.rejection_reason}`,
    related_signup_id: request._id,
    related_user_id: null,
  }, now);

  validateSignupRequestForWrite(reviewedRequest);
  validateLogShieldDocument(emailDoc);
  await bulkDocuments([reviewedRequest, emailDoc]);

  return {
    ok: true,
    signup_request: sanitizeSignupRequest(reviewedRequest),
    email_outbox: emailDoc._id,
  };
}

export async function ensureDevAdmin(now = new Date()) {
  const email = normalizeEmail(config.devLogin.email);
  const nikLookupHash = hashNik(config.devLogin.nik);
  const userId = "user::athar";
  const existing = await findCredentialByIdentifier({ kind: "email", value: email });
  if (existing) return { ok: true, seeded: false, user_id: existing.user_id };

  const encryptedNik = encryptSecret(config.devLogin.nik);
  const couchPassword = config.devLogin.password;
  const user = {
    _id: userId,
    type: "user",
    email,
    name: "Athar",
    nik: encryptedNik,
    kib_bencana_id: "BNC-2026-JK-0001",
    role: "admin",
    posko_id: null,
    phone: "081234567890",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  const credential = {
    _id: `auth_credential::${userId}`,
    type: "auth_credential",
    user_id: userId,
    email,
    nik: encryptedNik,
    nik_lookup_hash: nikLookupHash,
    password_hash: await bcrypt.hash(config.devLogin.password, 12),
    status: "active",
    couch_username: config.devLogin.username,
    couch_password_enc: encryptSecret(couchPassword),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  validateLogShieldDocument(user);
  validateLogShieldDocument(credential);
  await ensureCouchUser({
    username: config.devLogin.username,
    password: couchPassword,
    roles: [config.devLogin.couchRole],
  });
  await bulkDocuments([user, credential]);

  return { ok: true, seeded: true, user_id: userId };
}

export function authenticateRequest(req, _res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new AuthError("Missing bearer token", 401));
  try {
    req.auth = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return next(new AuthError("Invalid bearer token", 401));
  }
}

export function requireAdmin(req, _res, next) {
  const roles = req.auth?.roles || [];
  if (!roles.includes("admin")) return next(new AuthError("Admin role required", 403));
  return next();
}

export function requirePersonnelViewer(req, _res, next) {
  const roles = req.auth?.roles || [];
  if (!roles.some((role) => ["admin", "koordinator"].includes(role))) {
    return next(new AuthError("Admin or koordinator role required", 403));
  }
  return next();
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{16}$/.test(raw)) return { kind: "nik", value: hashNik(raw) };
  return { kind: "email", value: normalizeEmail(raw) };
}

export function hashNik(rawNik) {
  return createHmac("sha256", config.authHashSecret).update(String(rawNik)).digest("hex");
}

export function encryptSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGO, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptSecret(payload) {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv(AES_ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function encryptionKey() {
  return createHash("sha256").update(config.encryptionKey).digest();
}

async function assertNoExistingAccount(email, nikLookupHash) {
  const existingCredential = await findCredentialByIdentifier({ kind: "email", value: email })
    || await findCredentialByIdentifier({ kind: "nik", value: nikLookupHash });
  if (existingCredential) throw new AuthError("An account with this email or NIK already exists", 409);

  const existingSignup = await findSignupByIdentifier({ kind: "email", value: email })
    || await findSignupByIdentifier({ kind: "nik", value: nikLookupHash });
  if (existingSignup && ["pending", "approved"].includes(existingSignup.status)) {
    throw new AuthError("A signup request with this email or NIK already exists", 409);
  }
}

async function findCredentialByIdentifier(identifier) {
  const selector = identifier.kind === "nik"
    ? { type: "auth_credential", nik_lookup_hash: identifier.value }
    : { type: "auth_credential", email: identifier.value };
  const result = await findDocuments(selector, { limit: 1 });
  return result.docs?.[0] || null;
}

async function findSignupByIdentifier(identifier) {
  const selector = identifier.kind === "nik"
    ? { type: "signup_request", nik_lookup_hash: identifier.value }
    : { type: "signup_request", email: identifier.value };
  const result = await findDocuments(selector, { limit: 1 });
  return result.docs?.[0] || null;
}

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user._id,
      user_id: user._id,
      email: user.email,
      roles: [user.role],
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

function createEmailOutbox({ to, subject, body, related_signup_id, related_user_id }, now) {
  return {
    _id: `email_outbox::${now.getTime()}::${randomUUID()}`,
    type: "email_outbox",
    to,
    subject,
    body,
    status: "queued",
    related_signup_id,
    related_user_id,
    created_at: now.toISOString(),
    sent_at: null,
  };
}

function canViewPersonnel(viewer, user) {
  if (user._id === viewer._id) return false;
  if (viewer.role === "admin") return user.role !== "admin";
  if (viewer.role !== "koordinator") return false;
  if (user.role !== "lapangan") return false;
  if (!viewer.posko_id) return true;
  return user.posko_id === viewer.posko_id;
}

function personnelRowFromUser(user, viewer) {
  const row = {
    id: user._id,
    source: "user",
    status: "active",
    nama_personel: user.name,
    kib_bencana_id: user.kib_bencana_id,
    role: user.role,
    posko_assignment: user.posko_id,
    aksi: [],
  };

  if (viewer.role === "admin") {
    row.nik = decryptSecret(user.nik);
  }

  return row;
}

function personnelRowFromSignupRequest(request, viewer) {
  const row = {
    id: request._id,
    source: "signup_request",
    status: request.status,
    nama_personel: request.name,
    kib_bencana_id: null,
    role: null,
    posko_assignment: null,
    aksi: ["approve", "reject"],
  };

  if (viewer.role === "admin") {
    row.nik = decryptSecret(request.nik);
  }

  return row;
}

function sanitizeUser(user) {
  const { nik, ...safe } = user;
  return safe;
}

function sanitizeSignupRequest(request) {
  const { nik, password_hash, ...safe } = request;
  return safe;
}

function validateSignupRequestForWrite(doc) {
  const { password_hash, ...schemaDoc } = doc;
  validateLogShieldDocument(schemaDoc);
  if (doc.status === "pending" && !password_hash) {
    throw new AuthError("Pending signup request requires password_hash", 400);
  }
}

export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}
