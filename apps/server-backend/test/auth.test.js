import test from "node:test";
import assert from "node:assert/strict";
import { loginWithDummyUser } from "../src/auth.js";

test("dummy login accepts email", () => {
  const result = loginWithDummyUser({
    email: "athar@athar.com",
    password: "atharathar",
  });

  assert.equal(result.ok, true);
  assert.equal(result.user.username, "athar");
  assert.equal(result.couchdb.username, "athar");
  assert.equal(result.couchdb.password, "atharathar");
  assert.equal(typeof result.token, "string");
});

test("dummy login accepts username", () => {
  const result = loginWithDummyUser({
    username: "athar",
    password: "atharathar",
  });

  assert.equal(result.ok, true);
});

test("dummy login accepts nik", () => {
  const result = loginWithDummyUser({
    nik: "1234123412341234",
    password: "atharathar",
  });

  assert.equal(result.ok, true);
});

test("dummy login rejects wrong password", () => {
  assert.throws(
    () =>
      loginWithDummyUser({
        email: "athar@athar.com",
        password: "wrong",
      }),
    /Invalid credentials/
  );
});
