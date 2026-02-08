import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseOts, countAttestations, findBitcoinHeight, _Cursor as Cursor } from '../../src/core/parser.js';
import { bytesToHex } from '../../src/core/hex.js';

const FIXTURE_DIR = resolve(__dirname, '../fixtures');

describe('Cursor.readVaruint', () => {
  it('reads single-byte values', () => {
    const c = new Cursor(new Uint8Array([0x00]));
    expect(c.readVaruint()).toBe(0);
  });

  it('reads 1', () => {
    const c = new Cursor(new Uint8Array([0x01]));
    expect(c.readVaruint()).toBe(1);
  });

  it('reads 127', () => {
    const c = new Cursor(new Uint8Array([0x7f]));
    expect(c.readVaruint()).toBe(127);
  });

  it('reads 128 (multi-byte)', () => {
    // 128 = [0x80, 0x01]
    const c = new Cursor(new Uint8Array([0x80, 0x01]));
    expect(c.readVaruint()).toBe(128);
  });

  it('reads 300 (multi-byte)', () => {
    // 300 = [0xAC, 0x02]
    const c = new Cursor(new Uint8Array([0xac, 0x02]));
    expect(c.readVaruint()).toBe(300);
  });
});

describe('Cursor.readVarbytes', () => {
  it('reads length-prefixed bytes', () => {
    const c = new Cursor(new Uint8Array([0x03, 0xaa, 0xbb, 0xcc]));
    expect(c.readVarbytes()).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc]));
  });

  it('reads empty varbytes', () => {
    const c = new Cursor(new Uint8Array([0x00]));
    expect(c.readVarbytes()).toEqual(new Uint8Array([]));
  });
});

describe('parseOts', () => {
  it('rejects too-short data', () => {
    expect(() => parseOts(new Uint8Array([0x00, 0x01, 0x02]))).toThrow('Unexpected end of file');
  });

  it('rejects wrong magic header', () => {
    const data = new Uint8Array(31).fill(0x42);
    expect(() => parseOts(data)).toThrow('bad magic header');
  });

  it('parses hello-world.txt.ots fixture', () => {
    const data = new Uint8Array(readFileSync(resolve(FIXTURE_DIR, 'hello-world.txt.ots')));
    const ots = parseOts(data);

    // Should be SHA256
    expect(ots.hashOp).toBe('sha256');

    // Digest should be 32 bytes
    expect(ots.fileDigest.length).toBe(32);

    // Known digest of "Hello World!\n"
    expect(bytesToHex(ots.fileDigest)).toBe(
      '03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340'
    );

    // Should have exactly 1 attestation (Bitcoin)
    expect(countAttestations(ots.timestamp)).toBe(1);

    // Bitcoin block #358391
    expect(findBitcoinHeight(ots.timestamp)).toBe(358391);
  });
});
