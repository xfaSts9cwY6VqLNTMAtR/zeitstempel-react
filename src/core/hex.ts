/**
 * Hex encoding/decoding utilities.
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
