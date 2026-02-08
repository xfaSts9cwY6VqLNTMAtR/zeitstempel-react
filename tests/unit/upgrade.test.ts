import { describe, it, expect, vi, afterEach } from 'vitest';
import { upgradeProof } from '../../src/core/upgrade.js';
import { _ByteBuffer as ByteBuffer, writeVaruint, writeVarbytes } from '../../src/core/writer.js';
import { TAG_ATTESTATION, ATT_TAG_BITCOIN } from '../../src/core/constants.js';
import type { OtsFile } from '../../src/core/types.js';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Build a Bitcoin attestation sub-tree (what the calendar returns after confirmation). */
function makeBitcoinSubTree(height: number): Uint8Array {
  const buf = new ByteBuffer();
  buf.push(TAG_ATTESTATION);
  buf.extend(ATT_TAG_BITCOIN);
  const payload = new ByteBuffer();
  writeVaruint(payload, height);
  writeVarbytes(buf, payload.toUint8Array());
  return buf.toUint8Array();
}

/** Build a minimal OTS file with a single pending attestation. */
function makePendingOts(uri: string): OtsFile {
  return {
    hashOp: 'sha256',
    fileDigest: new Uint8Array(32),
    timestamp: {
      attestations: [{ type: 'pending', uri }],
      ops: [],
    },
  };
}

describe('upgradeProof', () => {
  it('returns alreadyComplete for proofs with no pending attestations', async () => {
    const ots: OtsFile = {
      hashOp: 'sha256',
      fileDigest: new Uint8Array(32),
      timestamp: {
        attestations: [{ type: 'bitcoin', height: 100000 }],
        ops: [],
      },
    };

    const result = await upgradeProof(ots);

    expect(result.alreadyComplete).toBe(true);
    expect(result.upgraded).toBe(0);
    expect(result.stillPending).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('upgrades a pending attestation when the server has the completed proof', async () => {
    const uri = 'https://alice.btc.calendar.opentimestamps.org';
    const ots = makePendingOts(uri);

    const bitcoinResponse = makeBitcoinSubTree(500000);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(bitcoinResponse.buffer),
    }));

    const result = await upgradeProof(ots);

    expect(result.upgraded).toBe(1);
    expect(result.stillPending).toBe(0);
    expect(result.alreadyComplete).toBe(false);

    // The pending attestation should be replaced with a Bitcoin one
    const btcAtt = ots.timestamp.attestations.find(a => a.type === 'bitcoin');
    expect(btcAtt).toBeDefined();
    if (btcAtt?.type === 'bitcoin') {
      expect(btcAtt.height).toBe(500000);
    }
  });

  it('counts stillPending when server returns 404', async () => {
    const ots = makePendingOts('https://alice.btc.calendar.opentimestamps.org');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const result = await upgradeProof(ots);

    expect(result.upgraded).toBe(0);
    expect(result.stillPending).toBe(1);
    expect(result.alreadyComplete).toBe(false);
  });

  it('records errors when server returns a non-404 error', async () => {
    const ots = makePendingOts('https://alice.btc.calendar.opentimestamps.org');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const result = await upgradeProof(ots);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('HTTP 500');
  });

  it('records errors when fetch itself fails', async () => {
    const ots = makePendingOts('https://alice.btc.calendar.opentimestamps.org');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('DNS resolution failed')));

    const result = await upgradeProof(ots);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('DNS resolution failed');
  });
});
