import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getDb, findDocByField } from "../lib/couch.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "logshield-dev-secret-change-in-production";
const SALT_ROUNDS = 10;

function generateCouchdbPassword() {
  return crypto.randomBytes(16).toString("hex");
}

router.post("/signup", async (req, res) => {
  try {
    const { email, name, nik, password, phone } = req.body;

    if (!email || !name || !nik || !password || !phone) {
      return res.status(400).json({ ok: false, message: "All fields are required" });
    }

    if (nik.length !== 16 || !/^\d{16}$/.test(nik)) {
      return res.status(400).json({ ok: false, message: "NIK must be 16 digits" });
    }

    const db = await getDb();

    const existing = await findDocByField("email", email);
    if (existing) {
      return res.status(409).json({ ok: false, message: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const nik_hash = crypto.createHash("sha256").update(nik).digest("hex");

    const id = `signup_request::${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await db.insert({
      _id: id,
      type: "signup_request",
      email,
      name,
      nik_hash,
      phone,
      password_hash,
      status: "pending",
      created_at: now,
      updated_at: now,
    });

    res.status(201).json({
      ok: true,
      id,
      status: "pending",
      message: "Registration submitted for admin review.",
    });
  } catch (err) {
    console.error("[auth/signup]", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "Identifier and password are required" });
    }

    const db = await getDb();

    const isEmail = identifier.includes("@");
    const user = await findDocByField(
      isEmail ? "email" : "nik_hash",
      isEmail ? identifier : crypto.createHash("sha256").update(identifier).digest("hex")
    );

    if (!user || user.type !== "user") {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        sub: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const couchdbUrl = process.env.COUCHDB_URL
      ? process.env.COUCHDB_URL.replace(/\/+$/, "") + "/logshield"
      : "http://localhost:5984/logshield";

    res.json({
      ok: true,
      token,
      user: {
        _id: user._id,
        type: "user",
        email: user.email,
        name: user.name,
        kib_bencana_id: user.kib_bencana_id,
        role: user.role,
        posko_id: user.posko_id || null,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      couchdb: {
        url: couchdbUrl,
        username: user.email,
        password: user.couchdb_password,
        database: "logshield",
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

export default router;
