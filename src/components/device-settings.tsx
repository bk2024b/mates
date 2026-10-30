'use client';
import { useEffect, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
export function DeviceSettings({ room }: { room: Room }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [output, setOutput] = useState(false);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const list = await Room.getLocalDevices(undefined, false);
        if (active) setDevices(list);
      } catch {
        if (active) setError('La liste des périphériques est indisponible.');
      }
    }
    setOutput('setSinkId' in HTMLMediaElement.prototype);
    room.on(RoomEvent.MediaDevicesChanged, refresh);
    room.on(RoomEvent.LocalTrackPublished, refresh);
    void refresh();
    return () => {
      active = false;
      room.off(RoomEvent.MediaDevicesChanged, refresh);
      room.off(RoomEvent.LocalTrackPublished, refresh);
    };
  }, [room]);
  async function change(kind: MediaDeviceKind, id: string) {
    setError('');
    try {
      const changed = await room.switchActiveDevice(kind, id);
      if (changed) setSelected((v) => ({ ...v, [kind]: id }));
      else setError('Ce périphérique n’a pas pu être sélectionné.');
    } catch {
      setError('Vérifie le périphérique et les permissions du navigateur.');
    }
  }
  return (
    <div className="device-settings">
      <h3>Périphériques</h3>
      {(
        [
          ['audioinput', 'Microphone'],
          ['videoinput', 'Caméra'],
          ...(output ? [['audiooutput', 'Sortie audio']] : []),
        ] as [MediaDeviceKind, string][]
      ).map(([kind, label]) => (
        <div key={kind}>
          <label htmlFor={`device-${kind}`}>{label}</label>
          <select
            id={`device-${kind}`}
            value={selected[kind] || ''}
            onChange={(e) => void change(kind, e.target.value)}
          >
            <option value="" disabled>
              Réglage actuel
            </option>
            {devices
              .filter((d) => d.kind === kind)
              .map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId} disabled={!d.deviceId}>
                  {d.label || `${label} ${i + 1}`}
                </option>
              ))}
          </select>
        </div>
      ))}
      <p className="small muted">
        Active volontairement le micro ou la caméra pour autoriser l’accès et afficher leurs noms.
      </p>
      {error && (
        <p className="chat-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
