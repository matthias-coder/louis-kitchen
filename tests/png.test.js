import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { encodePng } from '../tools/png.js';

/** @param {Buffer} png @returns {{ type: string, data: Buffer }[]} */
function readChunks(png) {
  const chunks = [];
  let pos = 8;
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    chunks.push({ type: png.toString('ascii', pos + 4, pos + 8), data: png.subarray(pos + 8, pos + 8 + len) });
    pos += 12 + len;
  }
  return chunks;
}

test('encodePng writes signature and IHDR, IDAT, IEND chunks', () => {
  const png = encodePng(1, 1, Uint8Array.from([255, 0, 0, 255]));
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunks = readChunks(png);
  assert.deepEqual(chunks.map((c) => c.type), ['IHDR', 'IDAT', 'IEND']);
  const ihdr = chunks[0].data;
  assert.equal(ihdr.readUInt32BE(0), 1);
  assert.equal(ihdr.readUInt32BE(4), 1);
  assert.equal(ihdr[8], 8);
  assert.equal(ihdr[9], 6);
});

test('IDAT inflates to filter byte 0 plus the RGBA scanline', () => {
  const png = encodePng(1, 1, Uint8Array.from([255, 0, 0, 255]));
  const idat = readChunks(png).find((c) => c.type === 'IDAT');
  assert.ok(idat);
  assert.deepEqual([...zlib.inflateSync(idat.data)], [0, 255, 0, 0, 255]);
});

test('encodePng rejects a wrong buffer length', () => {
  assert.throws(() => encodePng(2, 2, new Uint8Array(4)));
});
