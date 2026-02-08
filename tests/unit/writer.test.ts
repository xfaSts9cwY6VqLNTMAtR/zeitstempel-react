import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { writeOts, writeVaruint, writeVarbytes, _ByteBuffer as ByteBuffer } from '../../src/core/writer.js';
import { parseOts, countAttestations, _Cursor as Cursor } from '../../src/core/parser.js';
import { HEADER_MAGIC } from '../../src/core/constants.js';

const FIXTURE_DIR = resolve(__dirname, '../fixtures');

describe('writeVaruint', () => {
  it('encodes 0 as [0x00]', () => {
    const buf = new ByteBuffer();
    writeVaruint(buf, 0);
    expect(buf.toUint8Array()).toEqual(new Uint8Array([0x00]));
  });

  it('encodes 1 as [0x01]', () => {
    const buf = new ByteBuffer();
    writeVaruint(buf, 1);
    expect(buf.toUint8Array()).toEqual(new Uint8Array([0x01]));
  });

  it('encodes 128 as [0x80, 0x01]', () => {
    const buf = new ByteBuffer();
    writeVaruint(buf, 128);
    expect(buf.toUint8Array()).toEqual(new Uint8Array([0x80, 0x01]));
  });

  it('encodes 300 as [0xAC, 0x02]', () => {
    const buf = new ByteBuffer();
    writeVaruint(buf, 300);
    expect(buf.toUint8Array()).toEqual(new Uint8Array([0xac, 0x02]));
  });
});

describe('varuint roundtrip', () => {
  const values = [0, 1, 42, 127, 128, 300, 16384, 1_000_000];
  for (const val of values) {
    it(`roundtrips ${val}`, () => {
      const buf = new ByteBuffer();
      writeVaruint(buf, val);
      const c = new Cursor(buf.toUint8Array());
      expect(c.readVaruint()).toBe(val);
    });
  }
});

describe('varbytes roundtrip', () => {
  it('roundtrips data', () => {
    const data = new Uint8Array([0xaa, 0xbb, 0xcc]);
    const buf = new ByteBuffer();
    writeVarbytes(buf, data);
    const c = new Cursor(buf.toUint8Array());
    expect(c.readVarbytes()).toEqual(data);
  });

  it('roundtrips empty data', () => {
    const buf = new ByteBuffer();
    writeVarbytes(buf, new Uint8Array([]));
    const c = new Cursor(buf.toUint8Array());
    expect(c.readVarbytes()).toEqual(new Uint8Array([]));
  });
});

describe('writeOts', () => {
  it('starts with magic header', () => {
    const data = new Uint8Array(readFileSync(resolve(FIXTURE_DIR, 'hello-world.txt.ots')));
    const ots = parseOts(data);
    const serialized = writeOts(ots);
    expect(serialized.slice(0, 31)).toEqual(HEADER_MAGIC);
  });

  it('roundtrips hello-world.txt.ots (parse → write → parse)', () => {
    const data = new Uint8Array(readFileSync(resolve(FIXTURE_DIR, 'hello-world.txt.ots')));
    const ots = parseOts(data);

    const serialized = writeOts(ots);
    const reparsed = parseOts(serialized);

    // Same hash op and digest
    expect(reparsed.hashOp).toBe(ots.hashOp);
    expect(reparsed.fileDigest).toEqual(ots.fileDigest);

    // Same attestation count
    expect(countAttestations(reparsed.timestamp)).toBe(countAttestations(ots.timestamp));
  });
});
