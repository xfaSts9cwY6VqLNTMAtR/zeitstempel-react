import { describe, it, expect } from 'vitest';
import { bytesToHex, hexToBytes } from '../../src/core/hex.js';

describe('bytesToHex', () => {
  it('converts empty array', () => {
    expect(bytesToHex(new Uint8Array([]))).toBe('');
  });

  it('converts known bytes', () => {
    expect(bytesToHex(new Uint8Array([0x00, 0xff, 0x42]))).toBe('00ff42');
  });

  it('produces lowercase hex', () => {
    expect(bytesToHex(new Uint8Array([0xAB, 0xCD]))).toBe('abcd');
  });
});

describe('hexToBytes', () => {
  it('converts empty string', () => {
    expect(hexToBytes('')).toEqual(new Uint8Array([]));
  });

  it('converts known hex', () => {
    expect(hexToBytes('00ff42')).toEqual(new Uint8Array([0x00, 0xff, 0x42]));
  });

  it('handles uppercase', () => {
    expect(hexToBytes('ABCD')).toEqual(new Uint8Array([0xab, 0xcd]));
  });

  it('throws on odd-length string', () => {
    expect(() => hexToBytes('abc')).toThrow('Odd-length hex string');
  });

  it('throws on invalid characters', () => {
    expect(() => hexToBytes('zz')).toThrow('Invalid hex');
  });
});

describe('roundtrip', () => {
  it('bytes → hex → bytes', () => {
    const original = new Uint8Array([0x03, 0xba, 0x20, 0x4e, 0x50]);
    expect(hexToBytes(bytesToHex(original))).toEqual(original);
  });

  it('hex → bytes → hex', () => {
    const original = '03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340';
    expect(bytesToHex(hexToBytes(original))).toBe(original);
  });
});
