/**
 * Core data types for parsed OpenTimestamps proofs.
 *
 * These mirror the Rust zeitstempel types but use TypeScript
 * discriminated unions instead of Rust enums.
 */

import type { HashOp } from './constants.js';

/** A parsed .ots file. */
export interface OtsFile {
  hashOp: HashOp;
  fileDigest: Uint8Array;
  timestamp: Timestamp;
}

/** A node in the timestamp proof tree. */
export interface Timestamp {
  attestations: Attestation[];
  ops: [Operation, Timestamp][];
}

/** A proof-chain operation that transforms the current message. */
export type Operation =
  | { type: 'append'; data: Uint8Array }
  | { type: 'prepend'; data: Uint8Array }
  | { type: 'sha256' }
  | { type: 'sha1' }
  | { type: 'ripemd160' }
  | { type: 'keccak256' }
  | { type: 'reverse' }
  | { type: 'hexlify' };

/** A leaf attestation — the proof endpoint. */
export type Attestation =
  | { type: 'bitcoin'; height: number }
  | { type: 'litecoin'; height: number }
  | { type: 'ethereum'; height: number }
  | { type: 'pending'; uri: string }
  | { type: 'unknown'; tag: Uint8Array; payload: Uint8Array };

/** Result of verifying one attestation path. */
export type VerifyResult =
  | { status: 'verified'; height: number; blockHash: string; blockTime: number }
  | { status: 'pending'; uri: string }
  | { status: 'failed'; height: number; expected: Uint8Array; got: Uint8Array }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; message: string };

/** Statistics from an upgrade attempt. */
export interface UpgradeResult {
  upgraded: number;
  stillPending: number;
  errors: string[];
  alreadyComplete: boolean;
}
