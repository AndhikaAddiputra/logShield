import bcrypt from "bcryptjs";
import { findDocuments, getDocument, putDocument, putExistingDocument } from "./couchdb.js";
import { validateLogShieldDocument, ValidationError } from "./document-schema.js";
import { AuthError, normalizeEmail } from "./auth.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  email: true,
  app: true,
  sms: false,
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = ["image/jpeg", "image/png"];

export async function getSettings(actor, now = new Date()) {
  const [user, credential, settings] = await Promise.all([
    getUser(actor.user_id),
    getCredential(actor.user_id),
    getOrCreateUserSettings(actor.user_id, now),
  ]);

  return {
    ok: true,
    profile: toProfile(user, credential, settings),
    notifications: toNotificationResponse(settings),
  };
}

export async function updateProfile(actor, input = {}, now = new Date()) {
  const user = await getUser(actor.user_id);
  const credential = await getCredential(actor.user_id);
  const nextUser = {
    ...user,
    updated_at: now.toISOString(),
  };
  const nextCredential = {
    ...credential,
    updated_at: now.toISOString(),
  };
  const docs = [];

  if (input.name !== undefined) nextUser.name = requiredString(input.name, "name");
  if (input.phone !== undefined) nextUser.phone = requiredString(input.phone, "phone");
  if (input.avatar_url !== undefined) nextUser.avatar_url = optionalUrl(input.avatar_url, "avatar_url");
  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    validateEmail(email);
    if (email !== user.email) {
      await assertEmailAvailable(email, user._id);
      nextUser.email = email;
      nextCredential.email = email;
    }
  }

  validateLogShieldDocument(nextUser);
  validateLogShieldDocument(nextCredential);
  docs.push(putExistingDocument(nextUser));
  if (nextCredential.email !== credential.email) docs.push(putExistingDocument(nextCredential));
  await Promise.all(docs);

  return {
    ok: true,
    profile: toProfile(nextUser, nextCredential, nextSettings),
  };
}

export async function changePassword(actor, input = {}, now = new Date()) {
  const credential = await getCredential(actor.user_id);
  const currentPassword = requiredString(input.current_password, "current_password");
  const newPassword = passwordValue(input.new_password, "new_password");

  const passwordOk = await bcrypt.compare(currentPassword, credential.password_hash);
  if (!passwordOk) {
    throw new AuthError("Current password is incorrect", 403);
  }

  const nextCredential = {
    ...credential,
    password_hash: await bcrypt.hash(newPassword, 12),
    updated_at: now.toISOString(),
  };
  validateLogShieldDocument(nextCredential);
  await putExistingDocument(nextCredential);

  return {
    ok: true,
    message: "Password updated.",
  };
}

export async function updateNotificationSettings(actor, input = {}, now = new Date()) {
  const existing = await getOrCreateUserSettings(actor.user_id, now);
  const next = {
    ...existing,
    notifications: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(existing.notifications || {}),
      ...(input.email === undefined ? {} : { email: booleanValue(input.email, "email") }),
      ...(input.app === undefined ? {} : { app: booleanValue(input.app, "app") }),
      ...(input.sms === undefined ? {} : { sms: booleanValue(input.sms, "sms") }),
    },
    updated_at: now.toISOString(),
  };

  validateLogShieldDocument(next);
  const result = await putExistingDocument(next);
  return {
    ok: true,
    notifications: toNotificationResponse({ ...next, _rev: result.rev }),
  };
}

export async function uploadAvatar(actor, file, now = new Date()) {
  if (!file) {
    throw new ValidationError("avatar file is required");
  }
  if (!AVATAR_MIME_TYPES.includes(file.mimetype)) {
    throw new ValidationError("avatar must be JPG or PNG");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ValidationError("avatar must be at most 2MB");
  }

  const user = await getUser(actor.user_id);
  const credential = await getCredential(actor.user_id);
  const avatarUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const nextUser = {
    ...user,
    avatar_url: avatarUrl,
    updated_at: now.toISOString(),
  };
  validateLogShieldDocument(nextUser);
  await putExistingDocument(nextUser);

  return {
    ok: true,
    profile: toProfile(nextUser, credential),
  };
}

async function getUser(userId) {
  const user = await getDocument(userId);
  if (user.type !== "user") throw new AuthError("User not found", 404);
  return user;
}

async function getCredential(userId) {
  const result = await findDocuments({ type: "auth_credential", user_id: userId }, { limit: 1 });
  const credential = result.docs?.[0];
  if (!credential) throw new AuthError("Credential not found", 404);
  return credential;
}

async function getOrCreateUserSettings(userId, now) {
  const id = `user_settings::${userId}`;
  try {
    const existing = await getDocument(id);
    if (existing.type !== "user_settings") throw new AuthError("Settings not found", 404);
    return existing;
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  const doc = {
    _id: id,
    type: "user_settings",
    user_id: userId,
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  validateLogShieldDocument(doc);
  const result = await putDocument(doc);
  return { ...doc, _rev: result.rev };
}

async function assertEmailAvailable(email, currentUserId) {
  const existingUsers = await findDocuments({ type: "user", email }, { limit: 2 });
  if ((existingUsers.docs || []).some((user) => user._id !== currentUserId)) {
    throw new AuthError("Email is already used by another account", 409);
  }

  const existingCredentials = await findDocuments({ type: "auth_credential", email }, { limit: 2 });
  if ((existingCredentials.docs || []).some((credential) => credential.user_id !== currentUserId)) {
    throw new AuthError("Email is already used by another account", 409);
  }
}

function toProfile(user, credential, settings) {
  return {
    user_id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url || null,
    initials: initials(user.name),
    role: user.role,
    kib_bencana_id: user.kib_bencana_id,
    posko_id: user.posko_id,
    status: credential.status,
    status_label: credential.status === "active" ? "AKTIF" : "TIDAK AKTIF",
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function toNotificationResponse(settings) {
  return {
    _id: settings._id,
    user_id: settings.user_id,
    email: Boolean(settings.notifications?.email),
    app: Boolean(settings.notifications?.app),
    sms: Boolean(settings.notifications?.sms),
    updated_at: settings.updated_at,
  };
}

function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function passwordValue(value, field) {
  const text = requiredString(value, field);
  if (text.length < 8) {
    throw new ValidationError(`${field} must be at least 8 characters`);
  }
  return text;
}

function optionalUrl(value, field) {
  if (value === null || value === "") return undefined;
  const text = requiredString(value, field);
  if (!/^https?:\/\/|^data:image\/(png|jpeg);base64,/i.test(text)) {
    throw new ValidationError(`${field} must be an http(s) URL or JPG/PNG data URL`);
  }
  return text;
}

function validateEmail(value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ValidationError("email must be a valid email");
  }
}

function booleanValue(value, field) {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${field} must be a boolean`);
  }
  return value;
}
