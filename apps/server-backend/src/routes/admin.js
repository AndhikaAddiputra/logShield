import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getDb, findDocByField } from "../lib/couch.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 10;

router.use(requireAdmin);

router.get("/signup-requests", async (req, res) => {
  try {
    const db = await getDb();
    const statusFilter = req.query.status;
    const selector = { type: "signup_request" };
    if (statusFilter) {
      selector.status = statusFilter;
    }

    const result = await db.find({
      selector,
      sort: [{ created_at: "desc" }],
    });

    const requests = result.docs.map((doc) => ({
      _id: doc._id,
      type: doc.type,
      email: doc.email,
      name: doc.name,
      phone: doc.phone,
      status: doc.status,
      rejection_reason: doc.rejection_reason || null,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    }));

    res.json({ ok: true, data: requests });
  } catch (err) {
    console.error("[admin/signup-requests]", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

router.post("/signup-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { role, kib_bencana_id, posko_id } = req.body;

    if (!role || !kib_bencana_id) {
      return res.status(400).json({ ok: false, message: "Role and kib_bencana_id are required" });
    }

    const allowedRoles = ["admin", "koordinator", "lapangan"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ ok: false, message: `Role must be one of: ${allowedRoles.join(", ")}` });
    }

    const db = await getDb();

    let signupRequest;
    try {
      signupRequest = await db.get(id);
    } catch {
      return res.status(404).json({ ok: false, message: "Signup request not found" });
    }

    if (signupRequest.status !== "pending") {
      return res.status(409).json({ ok: false, message: `Signup request is already ${signupRequest.status}` });
    }

    const couchdb_password = crypto.randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const userId = `user::${crypto.randomUUID()}`;

    await db.insert({
      _id: userId,
      type: "user",
      email: signupRequest.email,
      name: signupRequest.name,
      nik_hash: signupRequest.nik_hash,
      phone: signupRequest.phone,
      password_hash: signupRequest.password_hash,
      role,
      kib_bencana_id,
      posko_id: posko_id || null,
      couchdb_password,
      created_at: now,
      updated_at: now,
    });

    await db.insert({
      _id: id,
      ...signupRequest,
      status: "approved",
      updated_at: now,
    });

    const emailId = `email_outbox::${Date.now()}::${crypto.randomUUID()}`;
    await db.insert({
      _id: emailId,
      type: "email_outbox",
      to: signupRequest.email,
      subject: "Akun LogShield Anda telah disetujui",
      body: `Halo ${signupRequest.name},\n\nAkun Anda dengan peran ${role} pada ${kib_bencana_id} telah disetujui. Silakan login menggunakan email dan kata sandi yang telah didaftarkan.\n\nTim LogShield`,
      status: "pending",
      created_at: now,
    });

    res.status(201).json({
      ok: true,
      user: {
        _id: userId,
        email: signupRequest.email,
        name: signupRequest.name,
        role,
        kib_bencana_id,
        posko_id: posko_id || null,
      },
      email_outbox: emailId,
    });
  } catch (err) {
    console.error("[admin/approve]", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

router.post("/signup-requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ ok: false, message: "Rejection reason is required" });
    }

    const db = await getDb();

    let signupRequest;
    try {
      signupRequest = await db.get(id);
    } catch {
      return res.status(404).json({ ok: false, message: "Signup request not found" });
    }

    if (signupRequest.status !== "pending") {
      return res.status(409).json({ ok: false, message: `Signup request is already ${signupRequest.status}` });
    }

    const now = new Date().toISOString();

    await db.insert({
      _id: id,
      ...signupRequest,
      status: "rejected",
      rejection_reason: reason,
      updated_at: now,
    });

    const emailId = `email_outbox::${Date.now()}::${crypto.randomUUID()}`;
    await db.insert({
      _id: emailId,
      type: "email_outbox",
      to: signupRequest.email,
      subject: "Pengajuan Akun LogShield Anda ditolak",
      body: `Halo ${signupRequest.name},\n\nPengajuan akun Anda terpaksa kami tolak dengan alasan:\n\n"${reason}"\n\nSilakan hubungi administrator untuk informasi lebih lanjut.\n\nTim LogShield`,
      status: "pending",
      created_at: now,
    });

    res.json({
      ok: true,
      message: "Signup request rejected.",
      email_outbox: emailId,
    });
  } catch (err) {
    console.error("[admin/reject]", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

export default router;
