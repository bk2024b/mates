/** Valeurs réellement mesurées par WebRTC. Aucun badge basé sur la cible demandée. */
export type VideoSample = {
  timestamp: string;
  direction: 'send' | 'receive';
  width?: number;
  height?: number;
  fps?: number;
  bitrateKbps?: number;
  lossPercent?: number;
  rttMs?: number;
  jitterMs?: number;
  freezes?: number;
  codec?: string;
  limitation?: string;
};
type Entry = Record<string, unknown> & { id: string; type: string; timestamp: number };
export type StatsSnapshot = Map<string, Entry>;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
export function summarizeStats(
  report: RTCStatsReport | { forEach: (fn: (entry: Entry) => void) => void },
  direction: VideoSample['direction'],
  previous: StatsSnapshot = new Map(),
): { sample: VideoSample; snapshot: StatsSnapshot } {
  const rows: Entry[] = [];
  report.forEach((entry) => rows.push(entry as Entry));
  const snapshot = new Map(rows.map((r) => [r.id, r]));
  const streams = rows.filter(
    (r) =>
      r.type === (direction === 'send' ? 'outbound-rtp' : 'inbound-rtp') &&
      (r.kind === 'video' || r.mediaType === 'video') &&
      !r.isRemote,
  );
  let kbps = 0;
  let hasDelta = false;
  let lost = 0;
  let received = 0;
  let primary: Entry | undefined;
  let largest = -1;
  for (const r of streams) {
    const prior = previous.get(r.id);
    const elapsed = prior ? (r.timestamp - prior.timestamp) / 1000 : 0;
    const bytes = num(r[direction === 'send' ? 'bytesSent' : 'bytesReceived']);
    const oldBytes = num(prior?.[direction === 'send' ? 'bytesSent' : 'bytesReceived']);
    if (elapsed > 0 && bytes !== undefined && oldBytes !== undefined && bytes >= oldBytes) {
      kbps += ((bytes - oldBytes) * 8) / elapsed / 1000;
      hasDelta = true;
    }
    const area = (num(r.frameWidth) || 0) * (num(r.frameHeight) || 0);
    // Ignore les couches simulcast inactives si leurs compteurs ne progressent plus.
    const active = !prior || bytes === undefined || oldBytes === undefined || bytes > oldBytes;
    if (active && area > largest) {
      primary = r;
      largest = area;
    }
    if (direction === 'receive' && prior) {
      lost += Math.max(0, (num(r.packetsLost) || 0) - (num(prior.packetsLost) || 0));
      received += Math.max(0, (num(r.packetsReceived) || 0) - (num(prior.packetsReceived) || 0));
    }
  }
  const p = primary;
  const prev = p ? previous.get(p.id) : undefined;
  const seconds = p && prev ? (p.timestamp - prev.timestamp) / 1000 : 0;
  const frameKey = direction === 'send' ? 'framesEncoded' : 'framesDecoded';
  const frameDelta =
    p && prev && num(p[frameKey]) !== undefined && num(prev[frameKey]) !== undefined
      ? Math.max(0, Number(p[frameKey]) - Number(prev[frameKey]))
      : undefined;
  const fps =
    num(p?.framesPerSecond) ??
    (seconds > 0 && frameDelta !== undefined ? frameDelta / seconds : undefined);
  const remote = rows.find(
    (r) => r.type === 'remote-inbound-rtp' && streams.some((s) => s.remoteId === r.id),
  );
  const transport = rows.find((r) => r.type === 'transport');
  const pair =
    rows.find((r) => r.id === transport?.selectedCandidatePairId) ||
    rows.find(
      (r) => r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated === true,
    );
  const rtt = num(remote?.roundTripTime) ?? num(pair?.currentRoundTripTime);
  const codec = p ? snapshot.get(String(p.codecId)) : undefined;
  return {
    snapshot,
    sample: {
      timestamp: new Date().toISOString(),
      direction,
      width: num(p?.frameWidth),
      height: num(p?.frameHeight),
      fps,
      bitrateKbps: hasDelta ? kbps : undefined,
      lossPercent:
        direction === 'receive' && received + lost > 0
          ? (lost / (received + lost)) * 100
          : undefined,
      rttMs: rtt === undefined ? undefined : rtt * 1000,
      jitterMs: num(p?.jitter) === undefined ? undefined : Number(p?.jitter) * 1000,
      freezes: num(p?.freezeCount),
      codec: typeof codec?.mimeType === 'string' ? codec.mimeType : undefined,
      limitation:
        typeof p?.qualityLimitationReason === 'string' ? p.qualityLimitationReason : undefined,
    },
  };
}
export function statsCsv(samples: VideoSample[]): string {
  const columns: (keyof VideoSample)[] = [
    'timestamp',
    'direction',
    'width',
    'height',
    'fps',
    'bitrateKbps',
    'lossPercent',
    'rttMs',
    'jitterMs',
    'freezes',
    'codec',
    'limitation',
  ];
  return [
    columns.join(','),
    ...samples.map((s) =>
      columns
        .map((k) => {
          const value = s[k];
          return value === undefined
            ? ''
            : typeof value === 'number'
              ? value.toFixed(2)
              : `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(','),
    ),
  ].join('\n');
}
