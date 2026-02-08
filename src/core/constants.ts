/**
 * OpenTimestamps binary format constants.
 *
 * Every .ots file starts with a 31-byte magic header, followed by a
 * version varuint, a hash-op tag, the file digest, and a recursive
 * timestamp tree made of operations (tagged bytes) and attestations.
 */

/** Every .ots file starts with these exact 31 bytes. */
// Encodes: \x00 "OpenTimestamps" \x00\x00 "Proof" \x00 \xbf\x89\xe2\xe8\x84\xe8\x92\x94
export const HEADER_MAGIC = new Uint8Array([
  0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d,
  0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00,
  0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf,
  0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);

// ── Tag bytes for operations ───────────────────────────────────────
export const TAG_APPEND    = 0xf0;
export const TAG_PREPEND   = 0xf1;
export const TAG_REVERSE   = 0xf2;
export const TAG_HEXLIFY   = 0xf3;
export const TAG_SHA1      = 0x02;
export const TAG_RIPEMD160 = 0x03;
export const TAG_SHA256    = 0x08;
export const TAG_KECCAK256 = 0x67;

// ── Special markers ────────────────────────────────────────────────
export const TAG_ATTESTATION = 0x00;
export const TAG_FORK        = 0xff;

// ── Attestation type tags (8 bytes each) ───────────────────────────
export const ATT_TAG_BITCOIN  = new Uint8Array([0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01]);
export const ATT_TAG_LITECOIN = new Uint8Array([0x06, 0x86, 0x9a, 0x0d, 0x73, 0xd7, 0x1b, 0x45]);
export const ATT_TAG_ETHEREUM = new Uint8Array([0x30, 0xfe, 0x80, 0x87, 0xb5, 0xc7, 0xea, 0xd7]);
export const ATT_TAG_PENDING  = new Uint8Array([0x83, 0xdf, 0xe3, 0x0d, 0x2e, 0xf9, 0x0c, 0x8e]);

// ── Hash operation metadata ────────────────────────────────────────
export type HashOp = 'sha256' | 'sha1' | 'ripemd160' | 'keccak256';

export const HASH_OP_DIGEST_LEN: Record<HashOp, number> = {
  sha256: 32,
  sha1: 20,
  ripemd160: 20,
  keccak256: 32,
};

export const TAG_TO_HASH_OP: Partial<Record<number, HashOp>> = {
  [TAG_SHA256]:    'sha256',
  [TAG_SHA1]:      'sha1',
  [TAG_RIPEMD160]: 'ripemd160',
  [TAG_KECCAK256]: 'keccak256',
};

export const HASH_OP_TO_TAG: Record<HashOp, number> = {
  sha256:    TAG_SHA256,
  sha1:      TAG_SHA1,
  ripemd160: TAG_RIPEMD160,
  keccak256: TAG_KECCAK256,
};

export const HASH_OP_DISPLAY: Record<HashOp, string> = {
  sha256:    'SHA256',
  sha1:      'SHA1',
  ripemd160: 'RIPEMD160',
  keccak256: 'KECCAK256',
};
