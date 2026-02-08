/**
 * ASCII art proof tree display.
 *
 * Ported from zeitstempel's parser.rs print_info/print_timestamp_tree.
 * Returns a formatted string instead of printing to stdout.
 */

import { HASH_OP_DISPLAY } from './constants.js';
import { bytesToHex } from './hex.js';
import type { OtsFile, Timestamp, Operation, Attestation } from './types.js';

/** Format the complete proof tree as a human-readable string. */
export function formatProofTree(ots: OtsFile): string {
  const lines: string[] = [];
  lines.push(`File hash: ${bytesToHex(ots.fileDigest)} (${HASH_OP_DISPLAY[ots.hashOp]})`);
  lines.push('\u2502'); // │
  formatTimestampTree(ots.timestamp, '', lines);
  return lines.join('\n');
}

function formatTimestampTree(ts: Timestamp, prefix: string, lines: string[]): void {
  const total = ts.attestations.length + ts.ops.length;
  let index = 0;

  for (const att of ts.attestations) {
    const isLast = index === total - 1;
    const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '; // └── or ├──
    lines.push(`${prefix}${connector}${formatAttestation(att)}`);
    index++;
  }

  for (const [op, child] of ts.ops) {
    const isLast = index === total - 1;
    const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '; // └── or ├──
    const extension = isLast ? '    ' : '\u2502   ';                            // (space) or │
    lines.push(`${prefix}${connector}${formatOperation(op)}`);
    formatTimestampTree(child, `${prefix}${extension}`, lines);
    index++;
  }
}

function formatOperation(op: Operation): string {
  switch (op.type) {
    case 'append':    return `append(${bytesToHex(op.data)})`;
    case 'prepend':   return `prepend(${bytesToHex(op.data)})`;
    case 'sha256':    return 'SHA256';
    case 'sha1':      return 'SHA1';
    case 'ripemd160': return 'RIPEMD160';
    case 'keccak256': return 'KECCAK256';
    case 'reverse':   return 'reverse';
    case 'hexlify':   return 'hexlify';
  }
}

function formatAttestation(att: Attestation): string {
  switch (att.type) {
    case 'bitcoin':  return `Bitcoin block #${att.height}`;
    case 'litecoin': return `Litecoin block #${att.height}`;
    case 'ethereum': return `Ethereum block #${att.height}`;
    case 'pending':  return `Pending (${att.uri})`;
    case 'unknown':  return `Unknown attestation (tag: ${bytesToHex(att.tag)})`;
  }
}
