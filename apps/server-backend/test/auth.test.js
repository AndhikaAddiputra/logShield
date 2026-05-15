import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptSecret,
  encryptSecret,
  hashNik,
  normalizeEmail,
  normalizeIdentifier,
} from "../src/auth.js";

test("normalizes email identifiers", () => {
  assert.equal(normalizeEmail("  ATHAR@ATHAR.COM "), "athar@athar.com");
  assert.deepEqual(normalizeIdentifier("ATHAR@ATHAR.COM"), {
    kind: "email",
    value: "athar@athar.com",
  });
});

test("hashes NIK deterministically without returning raw NIK", () => {
  const first = hashNik("1234123412341234");
  const second = hashNik("1234123412341234");

  assert.equal(first, second);
  assert.notEqual(first, "1234123412341234");
  assert.deepEqual(normalizeIdentifier("1234123412341234"), {
    kind: "nik",
    value: first,
  });
});

test("encrypts and decrypts secrets", () => {
  const encrypted = encryptSecret("1234123412341234");

  assert.notEqual(encrypted, "1234123412341234");
  assert.equal(decryptSecret(encrypted), "1234123412341234");
});
