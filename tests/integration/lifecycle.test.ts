/**
 * Full lifecycle integration test: stamp → check → (wait) → upgrade → verify.
 *
 * This test hits real OpenTimestamps calendar servers and (optionally)
 * waits for Bitcoin confirmation before attempting to upgrade and verify.
 *
 * Run with:
 *   npx vitest run tests/integration/lifecycle.test.ts
 *
 * If you choose to wait for confirmation, grab a coffee (or three).
 * Bitcoin blocks take ~10 minutes on average, and calendar servers
 * typically need 1-3 blocks before the proof is anchored.
 */

import { describe, it, expect } from 'vitest';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  stampFile,
  parseOts,
  writeOts,
  hasPending,
  formatProofTree,
  upgradeProof,
  verifyFile,
  verifyDigest,
  bytesToHex,
  sha256,
} from '../../src/core/index.js';

/** Ask a yes/no question in the terminal. Returns true for yes. */
async function askUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`\n${question} (y/n) `);
    return answer.trim().toLowerCase().startsWith('y');
  } finally {
    rl.close();
  }
}

/** Sleep for the given number of milliseconds, logging a countdown every minute. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const totalMinutes = Math.ceil(ms / 60_000);
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed++;
      const remaining = totalMinutes - elapsed;
      if (remaining > 0) {
        console.log(`  ... ${remaining} minute${remaining === 1 ? '' : 's'} remaining`);
      }
    }, 60_000);
    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, ms);
  });
}

// 4 hours — generous timeout for the patient test
const PATIENT_TIMEOUT = 4 * 60 * 60 * 1000;

describe('Full OTS lifecycle (live network)', () => {
  // Shared state between the steps
  let fileData: Uint8Array;
  let otsBytes: Uint8Array;
  let fileDigestHex: string;

  it('stamps a sample file via real calendar servers', async () => {
    // Create a unique sample file so each run produces a fresh timestamp
    const content = `Hello from zeitstempel-react integration test!\nTimestamp: ${new Date().toISOString()}\nRandom: ${Math.random()}`;
    fileData = new TextEncoder().encode(content);

    console.log('\n  Stamping file content:');
    console.log(`    "${content.split('\n')[0]}"`);

    // Pre-compute the hash for later use with verifyDigest
    const digest = await sha256(fileData);
    fileDigestHex = bytesToHex(digest);
    console.log(`  SHA256: ${fileDigestHex}`);

    // Stamp it — this hits real calendar servers
    console.log('  Submitting to OpenTimestamps calendar servers...');
    otsBytes = await stampFile(fileData);

    console.log(`  Got ${otsBytes.length} bytes of .ots proof`);
    expect(otsBytes.length).toBeGreaterThan(0);
  }, 30_000);

  it('parses the fresh proof and confirms it is pending', () => {
    const ots = parseOts(otsBytes);

    expect(ots.hashOp).toBe('sha256');
    expect(bytesToHex(ots.fileDigest)).toBe(fileDigestHex);
    expect(hasPending(ots.timestamp)).toBe(true);

    console.log('\n  Proof tree (freshly stamped):');
    console.log(formatProofTree(ots).replace(/^/gm, '    '));
  });

  it('round-trips through writeOts → parseOts', () => {
    const ots = parseOts(otsBytes);
    const rewritten = writeOts(ots);
    const reparsed = parseOts(rewritten);

    expect(reparsed.hashOp).toBe(ots.hashOp);
    expect(bytesToHex(reparsed.fileDigest)).toBe(bytesToHex(ots.fileDigest));
    expect(hasPending(reparsed.timestamp)).toBe(true);

    console.log('  Round-trip: writeOts → parseOts passed');
  });

  it('upgrade attempt right away returns stillPending (too soon)', async () => {
    const ots = parseOts(otsBytes);
    const result = await upgradeProof(ots);

    console.log('\n  Immediate upgrade attempt:');
    console.log(`    upgraded: ${result.upgraded}`);
    console.log(`    stillPending: ${result.stillPending}`);
    console.log(`    errors: ${result.errors.length > 0 ? result.errors.join(', ') : 'none'}`);

    // It's almost certainly still pending — Bitcoin hasn't confirmed yet
    expect(result.stillPending).toBeGreaterThan(0);
    expect(result.alreadyComplete).toBe(false);
  }, 30_000);

  it('(optional) wait for Bitcoin confirmation, then upgrade and verify', async () => {
    console.log('\n  -------------------------------------------------------');
    console.log('  The proof is pending. Bitcoin needs 1-3 blocks to');
    console.log('  anchor it, which typically takes 30 min to 3 hours.');
    console.log('  -------------------------------------------------------');

    const wantToWait = await askUser('Want to wait ~3 hours and try upgrading?');

    if (!wantToWait) {
      console.log('  Skipping the wait. Smart choice for a quick test run!');
      return;
    }

    // --- The patient path ---

    const waitMinutes = 180;
    console.log(`\n  Alright, sleeping for ${waitMinutes} minutes...`);
    console.log('  (You can leave this terminal open and go do something nice.)');
    await sleep(waitMinutes * 60_000);

    // Try upgrading in a retry loop — sometimes it takes a bit longer
    const maxRetries = 6;
    const retryIntervalMin = 15;
    let upgraded = false;
    let ots = parseOts(otsBytes);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n  Upgrade attempt ${attempt}/${maxRetries}...`);
      const result = await upgradeProof(ots);

      console.log(`    upgraded: ${result.upgraded}, stillPending: ${result.stillPending}`);
      if (result.errors.length > 0) {
        console.log(`    errors: ${result.errors.join(', ')}`);
      }

      if (result.upgraded > 0 && result.stillPending === 0) {
        upgraded = true;
        // Save the upgraded proof
        otsBytes = writeOts(ots);
        break;
      }

      if (attempt < maxRetries) {
        console.log(`    Still pending. Retrying in ${retryIntervalMin} minutes...`);
        await sleep(retryIntervalMin * 60_000);
      }
    }

    if (!upgraded) {
      console.log('\n  Proof did not upgrade in time. This can happen if');
      console.log('  Bitcoin blocks were slow. Try running again later!');
      return;
    }

    // --- Verification ---

    console.log('\n  Proof upgraded! Verifying against Bitcoin blockchain...');
    console.log('\n  Upgraded proof tree:');
    console.log(formatProofTree(ots).replace(/^/gm, '    '));

    expect(hasPending(ots.timestamp)).toBe(false);

    // Verify with the original file data
    const results = await verifyFile(fileData, otsBytes);
    console.log('\n  Verification results (verifyFile):');
    for (const r of results) {
      if (r.status === 'verified') {
        const date = new Date(r.blockTime * 1000);
        console.log(`    VERIFIED at Bitcoin block #${r.height} (${date.toISOString()})`);
      } else {
        console.log(`    ${r.status}: ${'message' in r ? r.message : 'reason' in r ? r.reason : ''}`);
      }
    }

    const verified = results.filter(r => r.status === 'verified');
    expect(verified.length).toBeGreaterThan(0);

    // Also verify with the pre-computed digest
    const digestResults = await verifyDigest(fileDigestHex, otsBytes);
    const digestVerified = digestResults.filter(r => r.status === 'verified');
    console.log(`\n  verifyDigest: ${digestVerified.length} verified attestation(s)`);
    expect(digestVerified.length).toBeGreaterThan(0);

    console.log('\n  Full lifecycle complete!');
  }, PATIENT_TIMEOUT);
});
