'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  type LocalTrack,
  type LocalTrackPublication,
} from 'livekit-client';
import { api } from '@/lib/api';
import type {
  JoinInfo,
  ControlSnapshot,
  ControlAction,
  MediaProfile,
  ShareSource,
} from '@/lib/contracts';
import { captureOptions, publishOptions } from '@/lib/media';
export function useRoomControl(session: JoinInfo, room: Room) {
  const [snapshot, setSnapshot] = useState<ControlSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const releasing = useRef<Promise<void> | null>(null);
  const path = `/api/rooms/${session.room.id}/control`;
  const refresh = useCallback(async () => {
    if (session.controls) setSnapshot(await api<ControlSnapshot>(path));
  }, [path, session.controls]);
  const send = useCallback(
    async (action: ControlAction, target?: string) => {
      return api<{ ok: boolean }>(path, { action, target, requestId: crypto.randomUUID() });
    },
    [path],
  );
  const release = useCallback(() => {
    if (!releasing.current)
      releasing.current = send('stop')
        .then(() => {})
        .catch(() => {})
        .finally(() => {
          releasing.current = null;
        });
    return releasing.current;
  }, [send]);
  useEffect(() => {
    if (!session.controls) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await api<ControlSnapshot>(path);
        if (!disposed) {
          setSnapshot(data);
          setError('');
          if (data.status === 'closed') void room.disconnect();
        }
      } catch {
        if (!disposed) setError('Les commandes du salon sont momentanément indisponibles.');
      } finally {
        if (!disposed) timer = setTimeout(poll, 4000);
      }
    }
    const ended = (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.ScreenShare) void release();
    };
    room.on(RoomEvent.LocalTrackUnpublished, ended);
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
      room.off(RoomEvent.LocalTrackUnpublished, ended);
    };
  }, [path, session.controls, room, release]);
  const eligible = session.controls
    ? !!snapshot &&
      (snapshot.hostId === session.identity || snapshot.presenters.includes(session.identity))
    : session.role === 'host';
  async function startShare(
    profile: MediaProfile,
    source: ShareSource = 'tab',
    prepared?: LocalTrack[],
  ) {
    let tracks: LocalTrack[] = prepared || [];
    let acquired = false;
    try {
      // Le sélecteur doit être appelé directement depuis le clic, avant toute requête API.
      if (!prepared)
        tracks = await room.localParticipant.createScreenTracks(captureOptions(profile, source));
      await send('acquire');
      acquired = true;
      const deadline = Date.now() + 3500;
      while (
        !room.localParticipant.permissions?.canPublishSources.includes(
          Track.sourceToProto(Track.Source.ScreenShare),
        )
      ) {
        if (Date.now() > deadline)
          throw new Error('La permission de partage n’a pas été reçue. Réessaie.');
        await new Promise((r) => setTimeout(r, 50));
      }
      for (const track of tracks)
        await room.localParticipant.publishTrack(track, publishOptions(profile));
      await refresh();
    } catch (e) {
      for (const track of tracks) {
        const pub = [...room.localParticipant.trackPublications.values()].find(
          (p) => p.track === track,
        );
        if (pub) await room.localParticipant.unpublishTrack(track, true);
        else track.stop();
      }
      if (acquired) await release();
      throw e;
    }
  }
  async function command(action: ControlAction, target?: string) {
    setBusy(true);
    setError('');
    try {
      await send(action, target);
      if (action === 'close') await room.disconnect();
      else await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La commande a échoué.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { snapshot, eligible, error, busy, startShare, release, command };
}
