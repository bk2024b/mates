'use client';
import { useEffect, useRef, useState } from 'react';
import { type LocalTrack, Track } from 'livekit-client';
import { Check, Volume2, VolumeX, LoaderCircle, X } from 'lucide-react';
import { VideoView } from './media-track';
export function SharePreview({
  tracks,
  busy,
  onCancel,
  onStart,
}: {
  tracks: LocalTrack[];
  busy: boolean;
  onCancel: () => void;
  onStart: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [level, setLevel] = useState(0),
    [meterAvailable, setMeterAvailable] = useState(false);
  const video = tracks.find(
    (t) => t.source === Track.Source.ScreenShare || t.kind === Track.Kind.Video,
  );
  const audio = tracks.find((t) => t.kind === Track.Kind.Audio);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (!audio) return;
    let context: AudioContext | undefined;
    let frame = 0;
    let disposed = false;
    try {
      context = new AudioContext();
      const source = context.createMediaStreamSource(new MediaStream([audio.mediaStreamTrack]));
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);
      const sample = () => {
        if (disposed) return;
        analyser.getByteTimeDomainData(buffer);
        let total = 0;
        for (const n of buffer) total += (n - 128) ** 2;
        setLevel(Math.min(100, Math.sqrt(total / buffer.length) * 4));
        frame = requestAnimationFrame(sample);
      };
      void context
        .resume()
        .then(() => {
          if (!disposed) {
            setMeterAvailable(true);
            sample();
          }
        })
        .catch(() => {});
    } catch {
      /* No audio meter on this browser: the presence of a track is still shown. */
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      void context?.close().catch(() => {});
    };
  }, [audio]);
  return (
    <dialog
      className="share-preview"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      aria-labelledby="preview-title"
    >
      <header>
        <div>
          <span className="eyebrow">AVANT D’OUVRIR LE RIDEAU</span>
          <h2 id="preview-title">Tout est prêt ?</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Annuler le partage"
          disabled={busy}
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </header>
      <div className="preview-screen">
        {video ? <VideoView track={video} /> : <p>Aucune image disponible.</p>}
        <span>Aperçu local · pas encore diffusé</span>
      </div>
      <div className={`preview-audio ${audio ? '' : 'missing'}`}>
        {audio ? <Volume2 size={20} /> : <VolumeX size={20} />}
        <div>
          <strong>{audio ? 'Piste audio détectée' : 'Aucun son capturé'}</strong>
          <p>
            {audio
              ? 'Lance quelques secondes du film pour vérifier le niveau, puis remets-le au début avant de diffuser.'
              : 'Annule puis coche le partage audio dans le sélecteur. Pour une application, le son peut ne pas être disponible.'}
          </p>
          {audio && meterAvailable && (
            <>
              <meter min={0} max={100} value={level} aria-label="Niveau du son capturé" />
              <small>
                {level > 2
                  ? 'Un signal audio est détecté.'
                  : 'Pas de signal mesuré pour le moment.'}
              </small>
            </>
          )}
        </div>
      </div>
      <p className="preview-note">
        Vérifie que le film est visible, sans écran noir. Cet aperçu ne peut pas confirmer ce
        qu’entendra chaque invité : demande une confirmation après le lancement.
      </p>
      <footer>
        <button className="button secondary" onClick={onCancel} disabled={busy}>
          Changer de source
        </button>
        <button className="button primary" disabled={busy || !video} onClick={onStart}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}Diffuser{' '}
          {audio ? 'la projection' : 'sans son'}
        </button>
      </footer>
    </dialog>
  );
}
