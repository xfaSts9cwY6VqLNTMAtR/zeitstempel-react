# zeitstempel-react

A lightweight TypeScript library for verifying [OpenTimestamps](https://opentimestamps.org/) proofs in the browser and Node.js, with optional React UI components.

## Background

This library is a JavaScript/TypeScript port of [zeitstempel](https://github.com/xfaSts9cwY6VqLNTMAtR/zeitstempel-react), a Rust implementation of the OpenTimestamps protocol. The original zeitstempel project handles cryptographic timestamp verification against the Bitcoin blockchain, providing tamper-proof evidence that data existed at a specific point in time. zeitstempel-react brings that same functionality to web applications and Node.js environments, re-implementing the core logic in TypeScript while preserving the security properties of the Rust original.

### What is OpenTimestamps?

OpenTimestamps (OTS) is a protocol for creating and verifying timestamp proofs anchored to the Bitcoin blockchain. Here's how it works:

1. **Stamping** -- You hash your data and submit the digest to public calendar servers. The servers aggregate many digests into a single Merkle tree and commit the root into a Bitcoin transaction.
2. **Verification** -- Given a `.ots` proof file and the original data, you walk the proof chain (a series of hash and concatenation operations) and check that the result matches a Bitcoin block's Merkle root.
3. **Upgrading** -- Newly created proofs are "pending" until the calendar server's Bitcoin transaction is confirmed. Upgrading replaces the pending attestation with a complete proof path to a specific block.

Because the proof chain only contains hashes, the original data is never revealed to calendar servers or the blockchain -- verification is fully privacy-preserving.

## Installation

```bash
npm install zeitstempel-react
```

React is an optional peer dependency. If you only need the core verification/stamping functions and don't use the React components, you don't need React installed at all.

## Quick start

### Verify a file against its `.ots` proof

```typescript
import { verifyFile } from 'zeitstempel-react';

const fileBytes = new Uint8Array(/* your file contents */);
const otsBytes = new Uint8Array(/* contents of the .ots proof file */);

const results = await verifyFile(fileBytes, otsBytes);

for (const result of results) {
  if (result.status === 'verified') {
    console.log(`Verified at Bitcoin block #${result.height}`);
  } else if (result.status === 'pending') {
    console.log(`Proof is pending (calendar: ${result.uri})`);
  }
}
```

### Create a timestamp

```typescript
import { stampFile } from 'zeitstempel-react';

const fileBytes = new Uint8Array(/* file to timestamp */);
const otsBytes = await stampFile(fileBytes);
// Save otsBytes as a .ots file alongside your original
```

### Verify a pre-computed hash

If you've already hashed your data, use `verifyDigest` to skip re-hashing:

```typescript
import { verifyDigest, parseOts } from 'zeitstempel-react';

const digest = 'a1b2c3...'; // hex-encoded SHA-256 digest of your file
const otsBytes = new Uint8Array(/* .ots proof */);

const results = await verifyDigest(digest, otsBytes);
```

### Upgrade a pending proof

```typescript
import { parseOts, upgradeProof, writeOts } from 'zeitstempel-react';

const ots = parseOts(otsBytes);
const result = await upgradeProof(ots);

if (result.upgraded > 0) {
  const updatedBytes = writeOts(ots);
  // Save updatedBytes -- the proof now contains a Bitcoin attestation
}
```

### Inspect a proof tree

```typescript
import { parseOts, formatProofTree } from 'zeitstempel-react';

const ots = parseOts(otsBytes);
console.log(formatProofTree(ots));
// Prints an ASCII diagram of the proof chain and attestations
```

## React components

Import from the `zeitstempel-react/react` entry point:

```typescript
import {
  VerifyTimestampButton,
  TimestampStatus,
  TimestampDownloadLinks,
} from 'zeitstempel-react/react';
```

### `<VerifyTimestampButton>`

A button that triggers verification and shows the result with visual feedback.

```tsx
<VerifyTimestampButton
  onVerify={async () => {
    const results = await verifyFile(fileBytes, otsBytes);
    return results;
  }}
  size="md"
  showLabel
/>
```

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onVerify` | `() => Promise<VerifyResult[]>` | required | Async function that performs verification |
| `size` | `'sm' \| 'md'` | `'sm'` | Button size |
| `showLabel` | `boolean` | `false` | Show text label next to icon |
| `labels` | `Partial<Record<VerifyStatus, string>>` | — | Custom labels per status |
| `className` | `string` | `''` | Additional CSS class |
| `children` | `(status, results) => ReactNode` | — | Custom render function |

### `<TimestampStatus>`

An inline badge that displays the current state of a timestamp.

```tsx
<TimestampStatus status="verified" blockHeight={841023} />
<TimestampStatus status="pending" calendarUri="https://alice.btc.calendar.opentimestamps.org" />
```

### `<TimestampDownloadLinks>`

Links for downloading the content hash and `.ots` proof file, with an optional external verification link.

```tsx
<TimestampDownloadLinks
  data={{ digest: '...', otsBytes: new Uint8Array([...]) }}
  compact={false}
/>
```

## API reference

### Parsing & serialization

| Function | Description |
|----------|-------------|
| `parseOts(bytes)` | Parse a `.ots` binary file into an `OtsFile` structure |
| `writeOts(ots)` | Serialize an `OtsFile` back to `.ots` binary format |
| `formatProofTree(ots)` | Render the proof tree as a human-readable ASCII string |

### Verification

| Function | Description |
|----------|-------------|
| `verifyFile(file, ots)` | Hash a file and verify it against a `.ots` proof |
| `verifyHash(hash, ots)` | Verify a pre-hashed `Uint8Array` against a `.ots` proof |
| `verifyDigest(hexDigest, ots)` | Verify a hex-encoded digest against a `.ots` proof |

Each returns `Promise<VerifyResult[]>` -- one result per attestation path in the proof tree.

### Stamping & upgrading

| Function | Description |
|----------|-------------|
| `stampFile(file)` | Hash and submit a file to calendar servers; returns `.ots` bytes |
| `stampHash(hexDigest)` | Submit an existing SHA-256 hex digest to calendar servers |
| `upgradeProof(ots)` | Replace pending attestations with completed Bitcoin proofs |

### Utilities

| Function | Description |
|----------|-------------|
| `bytesToHex(bytes)` | Convert `Uint8Array` to lowercase hex string |
| `hexToBytes(hex)` | Convert hex string to `Uint8Array` |
| `sha256(data)` | SHA-256 hash (uses native `crypto.subtle`) |
| `sha1(data)` | SHA-1 hash |
| `ripemd160(data)` | RIPEMD-160 hash (via `@noble/hashes`) |
| `countAttestations(ts)` | Count total attestations in a timestamp tree |
| `findBitcoinHeight(ts)` | Find the first Bitcoin attestation height, if any |
| `hasPending(ts)` | Check whether the proof has any pending attestations |
| `getBlockInfo(height)` | Fetch block hash, Merkle root, and time for a Bitcoin block |

### Types

```typescript
interface OtsFile {
  hashOp: HashOp;
  fileDigest: Uint8Array;
  timestamp: Timestamp;
}

interface Timestamp {
  attestations: Attestation[];
  ops: [Operation, Timestamp][];
}

type Operation =
  | { type: 'append'; data: Uint8Array }
  | { type: 'prepend'; data: Uint8Array }
  | { type: 'sha256' }
  | { type: 'sha1' }
  | { type: 'ripemd160' }
  | { type: 'keccak256' }
  | { type: 'reverse' }
  | { type: 'hexlify' };

type Attestation =
  | { type: 'bitcoin'; height: number }
  | { type: 'litecoin'; height: number }
  | { type: 'ethereum'; height: number }
  | { type: 'pending'; uri: string }
  | { type: 'unknown'; tag: Uint8Array; payload: Uint8Array };

type VerifyResult =
  | { status: 'verified'; height: number; blockHash: string; blockTime: number }
  | { status: 'pending'; uri: string }
  | { status: 'failed'; height: number; expected: Uint8Array; got: Uint8Array }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; message: string };
```

## Architecture

```
zeitstempel-react
├── core/          Zero-dependency TypeScript (no React required)
│   ├── parser     Binary .ots format reader
│   ├── writer     Binary .ots format writer
│   ├── verify     Proof verification against the Bitcoin blockchain
│   ├── stamp      Timestamp creation via calendar servers
│   ├── upgrade    Pending-to-confirmed proof conversion
│   ├── operations Proof-chain operation execution
│   ├── bitcoin    Blockstream / Mempool API client
│   ├── crypto     SHA-256, SHA-1, RIPEMD-160 wrappers
│   ├── hex        Hex encoding and constant-time byte comparison
│   └── info       ASCII proof-tree formatter
└── react/         Optional React components (peer dependency)
    ├── VerifyTimestampButton
    ├── TimestampStatus
    └── TimestampDownloadLinks
```

The core module has a single production dependency (`@noble/hashes` for RIPEMD-160); all other hashing uses the native `crypto.subtle` API. The React components are shipped as a separate entry point so the core library can be used in any JavaScript environment without pulling in React.

### Relationship to zeitstempel (Rust)

This project is a direct port of the Rust [zeitstempel](https://github.com/xfaSts9cwY6VqLNTMAtR/zeitstempel-react) crate. The module structure mirrors the Rust original:

- `parser.ts` is ported from `parser.rs`
- `writer.ts` from `writer.rs`
- `verify.ts` from `verify.rs`
- `operations.ts` from `operations.rs`
- `stamp.ts` from `stamp.rs`
- `upgrade.ts` from `upgrade.rs`
- `bitcoin.ts` from `bitcoin.rs`

TypeScript discriminated unions replace Rust enums, `Uint8Array` replaces `Vec<u8>`, and async/await replaces Rust futures. The binary format parsing and proof-chain logic is functionally identical -- a `.ots` file created by the Rust implementation will verify correctly in this library, and vice versa.

### Security considerations

- **Constant-time comparison**: All byte-array equality checks use a constant-time algorithm to prevent timing side-channel attacks.
- **Input validation**: The parser enforces size limits (1 MB for byte fields, 64 KB for HTTP responses) and checks for integer overflow in variable-length integer decoding.
- **Privacy**: Only SHA-256 digests (with a random nonce prepended) are sent to calendar servers. Original file contents never leave the client.
- **Request timeouts**: All HTTP requests to blockchain APIs and calendar servers use a 10-second timeout.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type-check without emitting
npm run lint

# Build for production
npm run build
```

## License

[MIT](LICENSE)
