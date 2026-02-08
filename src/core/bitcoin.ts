/**
 * Bitcoin block header lookups via public APIs.
 *
 * Ported from zeitstempel's bitcoin.rs.
 * Queries Blockstream.info first, with mempool.space as fallback.
 */

import { hexToBytes } from './hex.js';

export interface BlockInfo {
  height: number;
  blockHash: string;
  merkleRoot: string; // hex, display order (big-endian)
  timestamp: number;  // Unix epoch seconds
}

/**
 * Fetch block info for a given block height.
 * Tries Blockstream.info first, falls back to mempool.space.
 */
export async function getBlockInfo(height: number): Promise<BlockInfo> {
  try {
    return await getBlockInfoFrom('https://blockstream.info/api', height);
  } catch {
    return await getBlockInfoFrom('https://mempool.space/api', height);
  }
}

async function getBlockInfoFrom(baseUrl: string, height: number): Promise<BlockInfo> {
  // Step 1: Get block hash from height
  const hashResponse = await fetch(`${baseUrl}/block-height/${height}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!hashResponse.ok) {
    throw new Error(`HTTP ${hashResponse.status} from ${baseUrl}/block-height/${height}`);
  }
  const blockHash = (await hashResponse.text()).trim();

  if (blockHash.length !== 64) {
    throw new Error(`Expected 64-char block hash, got ${blockHash.length} chars`);
  }

  // Step 2: Get block details from hash
  const blockResponse = await fetch(`${baseUrl}/block/${blockHash}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!blockResponse.ok) {
    throw new Error(`HTTP ${blockResponse.status} from ${baseUrl}/block/${blockHash}`);
  }
  const json = await blockResponse.json();

  const merkleRoot = json.merkle_root;
  if (typeof merkleRoot !== 'string') {
    throw new Error('Missing merkle_root in block JSON');
  }

  const timestamp = json.timestamp;
  if (typeof timestamp !== 'number') {
    throw new Error('Missing timestamp in block JSON');
  }

  return { height, blockHash, merkleRoot, timestamp };
}

/**
 * Convert a hex merkle root (big-endian display order from API) to
 * little-endian bytes (which is what the OTS proof chain produces).
 *
 * Bitcoin's internal byte order is reversed from the display format.
 */
export function merkleRootToLeBytes(hexBe: string): Uint8Array {
  const bytes = hexToBytes(hexBe);
  bytes.reverse();
  return bytes;
}
