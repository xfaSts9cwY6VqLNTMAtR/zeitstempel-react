import { describe, it, expect } from 'vitest';
import { sha256, sha1, ripemd160 } from '../../src/core/crypto.js';
import { bytesToHex } from '../../src/core/hex.js';

describe('sha256', () => {
  it('hashes empty input', async () => {
    const result = await sha256(new Uint8Array([]));
    expect(bytesToHex(result)).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('hashes "Hello World!\\n"', async () => {
    const data = new TextEncoder().encode('Hello World!\n');
    const result = await sha256(data);
    expect(bytesToHex(result)).toBe(
      '03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340'
    );
  });
});

describe('sha1', () => {
  it('hashes empty input', async () => {
    const result = await sha1(new Uint8Array([]));
    expect(bytesToHex(result)).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });
});

describe('ripemd160', () => {
  it('hashes empty input', () => {
    const result = ripemd160(new Uint8Array([]));
    expect(bytesToHex(result)).toBe('9c1185a5c5e9fc54612808977ee8f548b2258d31');
  });
});
