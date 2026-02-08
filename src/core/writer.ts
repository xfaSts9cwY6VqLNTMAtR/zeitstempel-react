/**
 * Binary .ots format writer — the inverse of parser.ts.
 *
 * Ported from zeitstempel's writer.rs (~255 lines → ~130 TS lines).
 * Builds .ots proof files by writing the header, varuint-encoded
 * lengths, operation tags, and raw byte payloads into a Uint8Array.
 */

import {
  HEADER_MAGIC, HASH_OP_TO_TAG,
  TAG_APPEND, TAG_PREPEND, TAG_REVERSE, TAG_HEXLIFY,
  TAG_ATTESTATION, TAG_FORK,
  ATT_TAG_BITCOIN, ATT_TAG_LITECOIN, ATT_TAG_ETHEREUM, ATT_TAG_PENDING,
} from './constants.js';
import type { HashOp } from './constants.js';
import type { OtsFile, Timestamp, Operation, Attestation } from './types.js';

// ── Buffer builder ────────────────────────────────────────────────

/** A growable byte buffer for building binary data. */
class ByteBuffer {
  private chunks: number[] = [];

  push(byte: number): void {
    this.chunks.push(byte);
  }

  extend(bytes: Uint8Array): void {
    for (let i = 0; i < bytes.length; i++) {
      this.chunks.push(bytes[i]);
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.chunks);
  }
}

// ── Low-level writers ─────────────────────────────────────────────

/** Write an unsigned LEB128 varint. */
export function writeVaruint(buf: ByteBuffer, val: number): void {
  let v = val;
  for (;;) {
    let byte = v & 0x7f;
    v = Math.floor(v / 128); // Use division instead of >>7 for large values
    if (v !== 0) {
      byte |= 0x80;
    }
    buf.push(byte);
    if (v === 0) break;
  }
}

/** Write a length-prefixed byte string. */
export function writeVarbytes(buf: ByteBuffer, data: Uint8Array): void {
  writeVaruint(buf, data.length);
  buf.extend(data);
}

// ── Public API ─────────────────────────────────────────────────────

/** Serialize a complete OtsFile back to its binary .ots format. */
export function writeOts(ots: OtsFile): Uint8Array {
  const buf = new ByteBuffer();

  // Header + version 1
  buf.extend(HEADER_MAGIC);
  writeVaruint(buf, 1);

  // Hash op + file digest
  buf.push(HASH_OP_TO_TAG[ots.hashOp]);
  buf.extend(ots.fileDigest);

  // Timestamp tree
  writeTimestamp(buf, ots.timestamp);

  return buf.toUint8Array();
}

// ── Tree serialization ────────────────────────────────────────────

/** Serialize a timestamp tree node. */
function writeTimestamp(buf: ByteBuffer, ts: Timestamp): void {
  const totalBranches = ts.attestations.length + ts.ops.length;
  let branchIdx = 0;

  for (const att of ts.attestations) {
    if (branchIdx < totalBranches - 1) {
      buf.push(TAG_FORK);
    }
    writeAttestation(buf, att);
    branchIdx++;
  }

  for (const [op, child] of ts.ops) {
    if (branchIdx < totalBranches - 1) {
      buf.push(TAG_FORK);
    }
    writeOperation(buf, op);
    writeTimestamp(buf, child);
    branchIdx++;
  }
}

/** Serialize a single operation. */
function writeOperation(buf: ByteBuffer, op: Operation): void {
  switch (op.type) {
    case 'append':
      buf.push(TAG_APPEND);
      writeVarbytes(buf, op.data);
      break;
    case 'prepend':
      buf.push(TAG_PREPEND);
      writeVarbytes(buf, op.data);
      break;
    case 'sha256':    buf.push(HASH_OP_TO_TAG.sha256); break;
    case 'sha1':      buf.push(HASH_OP_TO_TAG.sha1); break;
    case 'ripemd160': buf.push(HASH_OP_TO_TAG.ripemd160); break;
    case 'keccak256': buf.push(HASH_OP_TO_TAG.keccak256); break;
    case 'reverse':   buf.push(TAG_REVERSE); break;
    case 'hexlify':   buf.push(TAG_HEXLIFY); break;
  }
}

/** Serialize an attestation: 0x00 marker + 8-byte type tag + varbytes payload. */
function writeAttestation(buf: ByteBuffer, att: Attestation): void {
  buf.push(TAG_ATTESTATION);

  switch (att.type) {
    case 'bitcoin': {
      buf.extend(ATT_TAG_BITCOIN);
      const payload = new ByteBuffer();
      writeVaruint(payload, att.height);
      writeVarbytes(buf, payload.toUint8Array());
      break;
    }
    case 'litecoin': {
      buf.extend(ATT_TAG_LITECOIN);
      const payload = new ByteBuffer();
      writeVaruint(payload, att.height);
      writeVarbytes(buf, payload.toUint8Array());
      break;
    }
    case 'ethereum': {
      buf.extend(ATT_TAG_ETHEREUM);
      const payload = new ByteBuffer();
      writeVaruint(payload, att.height);
      writeVarbytes(buf, payload.toUint8Array());
      break;
    }
    case 'pending':
      buf.extend(ATT_TAG_PENDING);
      writeVarbytes(buf, new TextEncoder().encode(att.uri));
      break;
    case 'unknown':
      buf.extend(att.tag);
      writeVarbytes(buf, att.payload);
      break;
  }
}

// Exported for tests
export { ByteBuffer as _ByteBuffer };
