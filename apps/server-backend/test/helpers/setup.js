import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { config } from "../../src/config.js";

export async function startTestServer() {
  const server = createServer(app);
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      resolve({ server, port: address.port, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

export function stopTestServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

export function createTestToken(overrides = {}) {
  const payload = {
    sub: "test::integration::user",
    user_id: "test::integration::user",
    email: "test@integration.test",
    roles: ["admin"],
    role: "admin",
    kib_bencana_id: "KIB-TEST-001",
    posko_id: null,
  };
  return jwt.sign({ ...payload, ...overrides }, config.jwtSecret, { expiresIn: "1h" });
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}
