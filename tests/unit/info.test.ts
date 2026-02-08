import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseOts } from '../../src/core/parser.js';
import { formatProofTree } from '../../src/core/info.js';

const FIXTURE_DIR = resolve(__dirname, '../fixtures');

describe('formatProofTree', () => {
  it('formats hello-world fixture', () => {
    const data = new Uint8Array(readFileSync(resolve(FIXTURE_DIR, 'hello-world.txt.ots')));
    const ots = parseOts(data);
    const output = formatProofTree(ots);

    // Should start with file hash line
    expect(output).toContain('03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340');
    expect(output).toContain('SHA256');

    // Should contain Bitcoin attestation
    expect(output).toContain('Bitcoin block #358391');

    // Should contain tree-drawing characters
    expect(output).toContain('\u2502'); // │
    expect(output).toContain('\u2514'); // └
  });

  it('produces non-empty output', () => {
    const data = new Uint8Array(readFileSync(resolve(FIXTURE_DIR, 'hello-world.txt.ots')));
    const ots = parseOts(data);
    const output = formatProofTree(ots);

    expect(output.length).toBeGreaterThan(100);
    expect(output.split('\n').length).toBeGreaterThan(3);
  });
});
