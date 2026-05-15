import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "logshield-dev-secret-change-in-production";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Missing authorization header" });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (payload.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
}
