import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStats, statsCsv } from '../src/lib/stats';
function report(entries: Record<string, unknown>[]) {
  return {
    forEach(fn: (entry: never) => void) {
      entries.forEach((entry) => fn(entry as never));
    },
  };
}
function inbound(ts: number, bytes: number, frames: number, received: number, lost: number) {
  return {
    id: 'video',
    type: 'inbound-rtp',
    timestamp: ts,
    kind: 'video',
    bytesReceived: bytes,
    framesDecoded: frames,
    packetsReceived: received,
    packetsLost: lost,
    frameWidth: 1920,
    frameHeight: 1080,
    jitter: 0.012,
    codecId: 'codec',
  };
}
test('débit, cadence et pertes sont calculés à partir des deltas reçus', () => {
  const first = summarizeStats(report([inbound(1000, 1000, 10, 100, 0)]), 'receive');
  const { sample } = summarizeStats(
    report([
      inbound(3000, 1001000, 70, 298, 2),
      { id: 'codec', type: 'codec', timestamp: 3000, mimeType: 'video/VP8' },
      {
        id: 'pair',
        type: 'candidate-pair',
        timestamp: 3000,
        state: 'succeeded',
        nominated: true,
        currentRoundTripTime: 0.08,
      },
    ]),
    'receive',
    first.snapshot,
  );
  assert.equal(sample.bitrateKbps, 4000);
  assert.equal(sample.fps, 30);
  assert.equal(sample.lossPercent, 1);
  assert.equal(sample.rttMs, 80);
  assert.equal(sample.jitterMs, 12);
  assert.equal(sample.codec, 'video/VP8');
  assert.equal(sample.width, 1920);
});
test('aucune valeur de qualité fictive avant le premier échantillon', () => {
  const { sample } = summarizeStats(report([]), 'receive');
  assert.equal(sample.fps, undefined);
  assert.equal(sample.width, undefined);
  assert.equal(sample.bitrateKbps, undefined);
});
test('les couches simulcast sont additionnées pour le débit envoyé', () => {
  const a = {
    id: 'high',
    type: 'outbound-rtp',
    timestamp: 1000,
    kind: 'video',
    bytesSent: 0,
    frameWidth: 1920,
    frameHeight: 1080,
  };
  const b = { ...a, id: 'low', frameWidth: 1280, frameHeight: 720 };
  const first = summarizeStats(report([a, b]), 'send');
  const { sample } = summarizeStats(
    report([
      { ...a, timestamp: 2000, bytesSent: 500000 },
      { ...b, timestamp: 2000, bytesSent: 100000 },
    ]),
    'send',
    first.snapshot,
  );
  assert.equal(sample.bitrateKbps, 4800);
  assert.equal(sample.width, 1920);
  assert.equal(sample.lossPercent, undefined);
});
test('le CSV contient les mesures sans identité ni secret', () => {
  const csv = statsCsv([{ timestamp: 'now', direction: 'receive', width: 1920 }]);
  assert.ok(csv.includes('1920.00'));
  assert.ok(!csv.includes('token'));
});
