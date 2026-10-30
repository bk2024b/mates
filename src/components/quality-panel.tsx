'use client';
import { useEffect, useState } from 'react';
import type { Track } from 'livekit-client';
import { Download, Activity, Info } from 'lucide-react';
import { statsCsv, summarizeStats, type StatsSnapshot, type VideoSample } from '@/lib/stats';
export function QualityPanel({ track, local }: { track?: Track; local: boolean }) {
  const [sample, setSample] = useState<VideoSample | null>(null);
  const [samples, setSamples] = useState<VideoSample[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let prev: StatsSnapshot = new Map();
    setSample(null);
    setSamples([]);
    setUnavailable(false);
    async function poll() {
      try {
        const report = await track?.getRTCStatsReport();
        if (cancelled) return;
        if (report) {
          const result = summarizeStats(report, local ? 'send' : 'receive', prev);
          prev = result.snapshot;
          setSample(result.sample);
          setSamples((s) => [...s.slice(-1798), result.sample]);
          setUnavailable(false);
        } else if (track) setUnavailable(true);
      } catch {
        if (!cancelled) setUnavailable(true);
      } finally {
        if (!cancelled) timer = setTimeout(poll, 2000);
      }
    }
    if (track) void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [track, local]);
  function download() {
    const url = URL.createObjectURL(
      new Blob([statsCsv(samples)], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `mates-qualite-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const val = (n: number | undefined, suffix: string, places = 0) =>
    n === undefined ? '—' : `${n.toFixed(places)} ${suffix}`;
  const metrics = [
    ['Résolution', sample?.width && sample?.height ? `${sample.width} × ${sample.height}` : '—'],
    ['Cadence', val(sample?.fps, 'i/s', 1)],
    [
      'Débit vidéo',
      val(sample?.bitrateKbps === undefined ? undefined : sample.bitrateKbps / 1000, 'Mbit/s', 2),
    ],
    ['RTT réseau', val(sample?.rttMs, 'ms')],
    ['Pertes vidéo', val(sample?.lossPercent, '%', 1)],
    ['Gigue vidéo', val(sample?.jitterMs, 'ms', 1)],
  ];
  return (
    <section className="quality-panel">
      <div className="panel-title">
        <span>
          <Activity size={16} /> Qualité du partage
        </span>
        <span className="tiny-badge">{local ? 'ÉMISSION' : 'RÉCEPTION'}</span>
      </div>
      <div className="metrics">
        {metrics.map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <p className="stats-note">
        <Info size={13} />
        {!track
          ? 'Les mesures apparaîtront au démarrage du partage.'
          : unavailable
            ? 'Statistiques non disponibles dans ce navigateur.'
            : local
              ? 'Débit cumulé des couches envoyées. La réception se mesure chez chaque spectateur.'
              : 'Valeurs WebRTC reçues. Le RTT réseau ne mesure pas la latence image de bout en bout.'}
      </p>
      {sample?.limitation && sample.limitation !== 'none' && (
        <p className="notice">Limitation de l’émetteur : {sample.limitation}</p>
      )}
      <div className="quality-footer">
        <span>
          {sample?.codec?.replace('video/', '').toUpperCase() || 'WEBRTC'} · {samples.length}{' '}
          mesures
        </span>
        <button className="text-link" onClick={download} disabled={!samples.length}>
          <Download size={14} /> CSV
        </button>
      </div>
    </section>
  );
}
