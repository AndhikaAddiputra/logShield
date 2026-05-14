import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function loginWithDummyUser({ email, username, nik, password }) {
  if (password !== config.devLogin.password) {
    throw new AuthError("Invalid credentials");
  }

  const identifier = email || username || nik;
  const validIdentifiers = [
    config.devLogin.email,
    config.devLogin.username,
    config.devLogin.nik,
  ];

  if (!validIdentifiers.includes(identifier)) {
    throw new AuthError("Invalid credentials");
  }

  const user = {
    id: `user::${config.devLogin.username}`,
    email: config.devLogin.email,
    username: config.devLogin.username,
    nik: config.devLogin.nik,
    roles: [config.devLogin.couchRole],
  };

  const token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    ok: true,
    token,
    user,
    couchdb: {
      url: `${config.couchUrl}/${config.couchDbName}`,
      username: config.devLogin.username,
      password: config.devLogin.password,
      database: config.couchDbName,
    },
  };
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
    this.statusCode = 401;
  }
}
