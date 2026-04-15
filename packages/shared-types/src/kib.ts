/**
 * KIB — Kode Identitas Bencana (16 digit), primary key across Log-Shield stores.
 * Format: numeric string, exactly 16 characters (leading zeros allowed).
 */

export const KIB_LENGTH = 16;

const KIB_REGEX = /^\d{16}$/;

export function isValidKib16(value: string): boolean {
  return typeof value === "string" && KIB_REGEX.test(value);
}

export function assertKib16(value: string): asserts value is Kib16 {
  if (!isValidKib16(value)) {
    throw new Error(`Invalid KIB: expected ${KIB_LENGTH}-digit numeric string`);
  }
}

/** Branded type for validated KIB */
export type Kib16 = string & { readonly __brand: "Kib16" };

export function toKib16(value: string): Kib16 {
  assertKib16(value);
  return value as Kib16;
}

/** Optional semantic split for reporting (not validated against BNPB tables here). */
export interface KibSegments {
  /** Digits 1–4 — often provinsi / wilayah administratif (depends on regulation version) */
  wilayah: string;
  /** Digits 5–8 */
  segment2: string;
  /** Digits 9–12 */
  segment3: string;
  /** Digits 13–16 */
  segment4: string;
}

export function parseKib16Segments(kib: Kib16): KibSegments {
  return {
    wilayah: kib.slice(0, 4),
    segment2: kib.slice(4, 8),
    segment3: kib.slice(8, 12),
    segment4: kib.slice(12, 16),
  };
}
