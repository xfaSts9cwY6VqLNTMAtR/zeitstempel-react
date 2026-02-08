/**
 * Hex encoding/decoding and low-level byte utilities.
 */

const HEX_CHARS = '0123456789abcdef';

/** Convert a Uint8Array to a lowercase hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += HEX_CHARS[bytes[i] >> 4] + HEX_CHARS[bytes[i] & 0x0f];
  }
  return hex;
}

/** Convert a hex string to a Uint8Array. Throws on invalid input. */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Odd-length hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const hi = parseInt(hex[i], 16);
    const lo = parseInt(hex[i + 1], 16);
    if (isNaN(hi) || isNaN(lo)) {
      throw new Error(`Invalid hex character at offset ${i}`);
    }
    bytes[i / 2] = (hi << 4) | lo;
  }
  return bytes;
}

/**
 * Constant-time comparison of two Uint8Arrays.
 *
 * Always examines every byte regardless of where a mismatch occurs,
 * preventing timing side-channels. Used as cryptographic hygiene
 * throughout the library — even where the compared values are public
 * today — so that future extensions or code reuse can't accidentally
 * introduce a timing leak.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
