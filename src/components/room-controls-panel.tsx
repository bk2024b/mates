'use client';
import { useState } from 'react';
import type { Participant } from 'livekit-client';
import type { ControlSnapshot, ControlAction } from '@/lib/contracts';
export function RoomControlsPanel({
  snapshot,
  people,
  busy,
  command,
}: {
  snapshot: ControlSnapshot | null;
  people: Participant[];
  busy: boolean;
  command: (action: ControlAction, target?: string) => Promise<unknown>;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!snapshot) return null;
  const host = snapshot.identity === snapshot.hostId;
  if (!host)
    return (
      <p className="control-summary">
        {snapshot.presenters.includes(snapshot.identity)
          ? 'L’hôte t’autorise à partager ton écran.'
          : 'Le partage est réservé à l’hôte et aux membres désignés.'}
      </p>
    );
  return (
    <section className="host-controls">
      <h3>Commandes de l’hôte</h3>
      {people
        .filter((p) => p.identity !== snapshot.hostId)
        .map((p) => (
          <div className="control-person" key={p.identity}>
            <span>{p.name || 'Mate'}</span>
            <button
              disabled={busy || snapshot.busy}
              onClick={() =>
                void command(
                  snapshot.presenters.includes(p.identity) ? 'presenter_remove' : 'presenter_add',
                  p.identity,
                )
              }
            >
              {snapshot.presenters.includes(p.identity)
                ? 'Retirer le partage'
                : 'Autoriser le partage'}
            </button>
            {confirm === p.identity ? (
              <span>
                <button
                  disabled={busy}
                  onClick={() => {
                    void command('kick', p.identity);
                    setConfirm(null);
                  }}
                >
                  Confirmer l’exclusion
                </button>
                <button onClick={() => setConfirm(null)}>Annuler</button>
              </span>
            ) : (
              <button disabled={busy || snapshot.busy} onClick={() => setConfirm(p.identity)}>
                Exclure
              </button>
            )}
          </div>
        ))}
      <div className="host-actions">
        <button
          disabled={busy || snapshot.busy || !snapshot.stageOwner}
          onClick={() => void command('stop')}
        >
          Arrêter la diffusion
        </button>
        {confirm === 'close' ? (
          <>
            <button disabled={busy} onClick={() => void command('close')}>
              Confirmer la fermeture
            </button>
            <button onClick={() => setConfirm(null)}>Annuler</button>
          </>
        ) : (
          <button disabled={busy} onClick={() => setConfirm('close')}>
            Fermer le salon
          </button>
        )}
      </div>
      {snapshot.busy && (
        <p>
          Une commande est en cours. Si elle reste bloquée, ferme le salon et crée-en un nouveau.
        </p>
      )}
    </section>
  );
}
