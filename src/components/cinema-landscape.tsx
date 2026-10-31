'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { RotateCw, X, LoaderCircle } from 'lucide-react';
import {
  requestCinemaLandscape,
  unlockCinemaOrientation,
  type CinemaOrientation,
} from '@/lib/cinema-view';
export function CinemaLandscape({
  active,
  target,
}: {
  active: boolean;
  target: RefObject<HTMLDivElement | null>;
}) {
  const [portrait, setPortrait] = useState(false),
    [dismissed, setDismissed] = useState(false),
    [manual, setManual] = useState(false),
    [busy, setBusy] = useState(false);
  const owned = useRef(false),
    disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    const media = window.matchMedia(
      '(max-width: 900px) and (orientation: portrait) and (pointer: coarse)',
    );
    const update = () => setPortrait(media.matches);
    update();
    media.addEventListener('change', update);
    const unlock = () => {
      if (owned.current) {
        unlockCinemaOrientation(window.screen.orientation as CinemaOrientation);
        owned.current = false;
      }
    };
    const full = () => {
      if (!document.fullscreenElement) unlock();
    };
    document.addEventListener('fullscreenchange', full);
    return () => {
      disposed.current = true;
      media.removeEventListener('change', update);
      document.removeEventListener('fullscreenchange', full);
      unlock();
    };
  }, []);
  useEffect(() => {
    if (!active && owned.current) {
      unlockCinemaOrientation(window.screen.orientation as CinemaOrientation);
      owned.current = false;
    }
  }, [active]);
  async function rotate() {
    if (!target.current || busy) return;
    setBusy(true);
    const result = await requestCinemaLandscape(
      target.current,
      document,
      (window.screen.orientation as CinemaOrientation) || {},
    );
    if (disposed.current) {
      if (result === 'locked')
        unlockCinemaOrientation(window.screen.orientation as CinemaOrientation);
      return;
    }
    owned.current = result === 'locked';
    setManual(result === 'manual');
    setBusy(false);
  }
  if (!active || !portrait || dismissed) return null;
  return (
    <div className="cinema-rotate-hint" role="status">
      <RotateCw size={20} />
      <div>
        <strong>{manual ? 'Tourne ton téléphone' : 'Le film mérite un grand écran.'}</strong>
        <p>
          {manual
            ? 'La rotation automatique n’est pas disponible ici. Tourne le téléphone et active la rotation dans ses réglages si nécessaire.'
            : 'Passe en paysage pour profiter de la projection.'}
        </p>
        {!manual && (
          <button onClick={() => void rotate()} disabled={busy}>
            {busy ? <LoaderCircle size={14} className="spin" /> : 'Passer en paysage'}
          </button>
        )}
      </div>
      <button
        className="rotate-dismiss"
        aria-label="Masquer la suggestion de paysage"
        onClick={() => setDismissed(true)}
      >
        <X size={16} />
      </button>
    </div>
  );
}
