'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  type Participant,
  type RemoteAudioTrack,
  type LocalTrackPublication,
  DisconnectReason,
} from 'livekit-client';
import {
  MonitorUp,
  MonitorOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Copy,
  Check,
  Maximize,
  Volume2,
  VolumeX,
  LoaderCircle,
  ArrowUpRight,
  Activity,
  SlidersHorizontal,
  X,
  Headphones,
  Shield,
  Radio,
  MessageCircle,
} from 'lucide-react';
import type { JoinInfo, MediaProfile } from '@/lib/contracts';
import { captureError, captureOptions, PROFILES, publishOptions, roomOptions } from '@/lib/media';
import { Brand } from './brand';
import { VideoView, AudioView, ScreenView } from './media-track';
import { api, ApiRequestError } from '@/lib/api';
import { useRoomControl } from './use-room-control';
import { useRoomChat } from './use-room-chat';
import { ChatPanel } from './chat-panel';
import { DeviceSettings } from './device-settings';
import { REACTIONS } from '@/lib/chat';
import { RoomControlsPanel } from './room-controls-panel';
import { QualityPanel } from './quality-panel';
function initial(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}
function isHost(p: Participant) {
  try {
    return JSON.parse(p.metadata || '{}').role === 'host';
  } catch {
    return false;
  }
}
export function MeetingRoom({
  session,
  onLeave,
  onSession,
}: {
  session: JoinInfo;
  onLeave: () => void;
  onSession: (next: JoinInfo) => void;
}) {
  const [room] = useState(() => new Room(roomOptions));
  const control = useRoomControl(session, room);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [started, setStarted] = useState(false);
  const [fatal, setFatal] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<MediaProfile>('motion');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'people' | 'quality' | 'chat'>(session.chat ? 'chat' : 'people');
  const [panelOpen, setPanelOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const chat = useRoomChat(session, room, tab === 'chat' && (!compact || panelOpen));
  useEffect(() => {
    if (!panelOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanelOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [panelOpen]);

  const [audioAllowed, setAudioAllowed] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(80);
  const [contentVolume, setContentVolume] = useState(100);
  const [supported, setSupported] = useState(false);
  const [lowCamera, setLowCamera] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const cameraSubscriptions = useRef(new Map<string, boolean>());
  const lifecycle = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    setSupported(!!navigator.mediaDevices?.getDisplayMedia && window.isSecureContext);
    let disposed = false;
    const update = () => {
      if (!disposed) setRevision((v) => v + 1);
    };
    const events = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ActiveSpeakersChanged,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ConnectionQualityChanged,
      RoomEvent.ParticipantMetadataChanged,
      RoomEvent.TrackStreamStateChanged,
      RoomEvent.ParticipantPermissionsChanged,
    ];
    for (const e of events) room.on(e, update);
    const connection = (s: ConnectionState) => {
      if (!disposed) {
        setState(s);
        if (s === ConnectionState.Connected) {
          setFatal('');
          cameraSubscriptions.current.clear();
        }
        setRevision((v) => v + 1);
      }
    };
    const audio = () => {
      if (!disposed) setAudioAllowed(room.canPlaybackAudio);
    };
    const disconnected = (reason?: DisconnectReason) => {
      if (
        session.controls &&
        reason === DisconnectReason.PARTICIPANT_REMOVED &&
        !disposed &&
        !leaving.current
      ) {
        // Une révocation de scène force une reconnexion avec un jeton minimal neuf.
        // Une exclusion réelle sera refusée par l’API et ne déclenchera pas de boucle.
        const reconnectName =
          room.localParticipant.name || sessionStorage.getItem('mates:nickname') || 'Mate';
        void (async () => {
          await new Promise((resolve) => setTimeout(resolve, 1800));
          if (disposed || leaving.current) return;
          try {
            const next = await api<JoinInfo>(`/api/rooms/${session.room.id}/join`, {
              name: reconnectName,
            });
            if (!disposed) onSession(next);
          } catch {
            if (!disposed)
              setFatal(
                'L’accès au salon a été interrompu. Reviens à l’entrée pour vérifier si tu peux le rejoindre.',
              );
          }
        })();
        return;
      }
      if (!disposed && !leaving.current) {
        setFatal(
          reason === DisconnectReason.DUPLICATE_IDENTITY
            ? 'Cette session a été ouverte dans un autre onglet. Utilise un autre navigateur pour un deuxième participant.'
            : reason === DisconnectReason.PARTICIPANT_REMOVED
              ? 'L’hôte t’a retiré du salon.'
              : reason === DisconnectReason.ROOM_DELETED
                ? 'L’hôte a fermé le salon.'
                : 'La connexion au salon a été interrompue. Reviens à l’entrée pour réessayer.',
        );
      }
    };
    const screenEnded = (publication: LocalTrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        const audio = room.localParticipant.getTrackPublication(
          Track.Source.ScreenShareAudio,
        )?.track;
        if (audio)
          void room.localParticipant.unpublishTrack(audio, true).catch(() => {
            if (!disposed) setMessage('Vérifie que le partage audio est bien arrêté.');
          });
      }
    };
    const mediaError = () => {
      if (!disposed)
        setMessage('Permission micro ou caméra refusée. Vérifie les réglages du navigateur.');
    };
    room
      .on(RoomEvent.ConnectionStateChanged, connection)
      .on(RoomEvent.AudioPlaybackStatusChanged, audio)
      .on(RoomEvent.Disconnected, disconnected)
      .on(RoomEvent.MediaDevicesError, mediaError)
      .on(RoomEvent.LocalTrackUnpublished, screenEnded);
    lifecycle.current = lifecycle.current.then(async () => {
      if (disposed) return;
      try {
        await room.connect(session.serverUrl, session.token, { autoSubscribe: true });
        if (disposed) return;
        setStarted(true);
        setAudioAllowed(room.canPlaybackAudio);
        update();
      } catch {
        if (!disposed)
          setFatal(
            'Connexion média impossible. Vérifie la configuration LiveKit, le réseau ou la capacité du salon.',
          );
      }
    });
    return () => {
      disposed = true;
      for (const e of events) room.off(e, update);
      room
        .off(RoomEvent.ConnectionStateChanged, connection)
        .off(RoomEvent.AudioPlaybackStatusChanged, audio)
        .off(RoomEvent.Disconnected, disconnected)
        .off(RoomEvent.MediaDevicesError, mediaError)
        .off(RoomEvent.LocalTrackUnpublished, screenEnded);
      lifecycle.current = lifecycle.current.then(async () => {
        await room.disconnect();
      });
    };
  }, [room, session.serverUrl, session.token, session.controls, session.room.id, onSession]);
  const participants: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
  const sharer = participants.find((p) => p.isScreenShareEnabled && !chat.blocked.has(p.identity));
  const screen = sharer?.getTrackPublication(Track.Source.ScreenShare)?.track;
  const localShare = sharer === room.localParticipant;
  const local = room.localParticipant;
  const sharedAudio = sharer?.getTrackPublication(Track.Source.ScreenShareAudio);
  const connected = state === ConnectionState.Connected;
  // Les petites caméras ne doivent pas concurrencer la scène : seule la voix et le partage restent prioritaires.
  useEffect(() => {
    for (const p of room.remoteParticipants.values()) {
      const pub = p.getTrackPublication(Track.Source.Camera);
      if (pub) {
        const desired = !lowCamera || !sharer;
        if (cameraSubscriptions.current.get(pub.trackSid) !== desired) {
          cameraSubscriptions.current.set(pub.trackSid, desired);
          pub.setSubscribed(desired);
        }
      }
    }
  }, [room, lowCamera, sharer, revision]);
  useEffect(() => {
    if (control.error) setMessage(control.error);
  }, [control.error]);
  async function toggleShare() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (local.isScreenShareEnabled) {
        await local.setScreenShareEnabled(false);
        if (session.controls) await control.release();
      } else {
        if (session.controls) await control.startShare(profile);
        else
          await local.setScreenShareEnabled(true, captureOptions(profile), publishOptions(profile));
        const audio = local.getTrackPublication(Track.Source.ScreenShareAudio);
        if (!audio)
          setMessage(
            'L’image est partagée, mais aucun son n’a été capturé. Pour une vidéo, choisis un onglet et coche le partage audio.',
          );
      }
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : captureError(e));
    } finally {
      setBusy(false);
      setRevision((v) => v + 1);
    }
  }
  async function toggleDevice(kind: 'mic' | 'camera') {
    setMessage('');
    try {
      if (kind === 'mic') await local.setMicrophoneEnabled(!local.isMicrophoneEnabled);
      else await local.setCameraEnabled(!local.isCameraEnabled);
      setRevision((v) => v + 1);
    } catch {
      setMessage(
        'Impossible d’activer ce périphérique. Vérifie sa disponibilité et les permissions du navigateur.',
      );
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage('Copie le lien du salon depuis la barre d’adresse de ton navigateur.');
    }
  }
  async function leave() {
    leaving.current = true;
    await room.disconnect();
    onLeave();
  }
  async function fullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      setMessage('Le plein écran n’est pas disponible dans ce navigateur.');
    }
  }
  const status = connected
    ? 'En direct'
    : state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting
      ? 'Reconnexion…'
      : started
        ? 'Déconnecté'
        : 'Connexion…';
  return (
    <main id="main-content" className="meeting">
      <header className="meeting-header">
        <Brand />
        <div className="meeting-title">
          <h1>{session.room.title}</h1>
          <span>
            <span className={`status-dot ${connected ? 'online' : ''}`} />
            {status}
            <i /> {participants.length}/{session.room.maxParticipants || '∞'} mates
          </span>
        </div>
        <button className="button invite" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? 'Lien copié' : 'Inviter des mates'}</span>
        </button>
      </header>
      <div className="meeting-content">
        <section className="stage-column">
          <div className="stage-top">
            <span className="eyebrow">
              <Radio size={14} />
              {screen ? 'LE MOMENT PARTAGÉ' : 'LA SCÈNE EST À VOUS'}
            </span>
            <span className="stage-private">
              <Shield size={13} />{' '}
              {session.room.visibility === 'public' ? 'Salon public' : 'Accès par lien'}
            </span>
          </div>
          <div className="stage" ref={stageRef}>
            {session.chat && (
              <div className="floating-reactions" aria-live="off">
                {chat.reactions.map((r) => (
                  <span key={r.id} style={{ left: `${12 + (r.id.charCodeAt(0) % 70)}%` }}>
                    {r.emoji}
                  </span>
                ))}
              </div>
            )}
            {screen ? (
              <>
                <ScreenView
                  track={screen}
                  audio={
                    !localShare ? (sharedAudio?.track as RemoteAudioTrack | undefined) : undefined
                  }
                  volume={contentVolume / 100}
                />
                <div className="stage-overlay">
                  <span>
                    <span className="live-dot" />
                    {sharer?.name || 'Un mate'} partage son écran
                  </span>
                  <button className="icon-button" aria-label="Plein écran" onClick={fullScreen}>
                    <Maximize size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="stage-empty">
                <div className="empty-orbits">
                  <span />
                  <span />
                  <div>
                    <MonitorUp size={38} />
                  </div>
                  <b className="orbit-star">✦</b>
                </div>
                <h2>
                  {control.eligible ? 'Une scène pour ta passion.' : 'Le moment va commencer.'}
                </h2>
                <p>
                  {control.eligible
                    ? 'Une vidéo, un projet, une idée. Partage ton écran pour lancer le moment.'
                    : 'Installe-toi. L’hôte peut partager son écran à tout moment.'}
                </p>
                {control.eligible && (
                  <button
                    className="button primary"
                    onClick={toggleShare}
                    disabled={
                      !connected ||
                      busy ||
                      !supported ||
                      (session.controls && (control.busy || !!control.snapshot?.busy))
                    }
                  >
                    {busy ? <LoaderCircle size={18} className="spin" /> : <MonitorUp size={18} />}
                    Partager mon écran
                  </button>
                )}
                <span className="stage-hint">
                  <Headphones size={14} /> Un casque, c’est encore mieux.
                </span>
              </div>
            )}
            {!connected && !fatal && (
              <div className="connection-overlay" role="status">
                <LoaderCircle size={28} className="spin" />
                <strong>{status}</strong>
                <span>On te garde une place.</span>
              </div>
            )}
          </div>
          {fatal && (
            <div className="error connection-error" role="alert">
              <span>{fatal}</span>
              <button className="button secondary" onClick={() => void leave()}>
                Revenir à l’entrée
              </button>
            </div>
          )}
          {message && (
            <div className="notice dismissible" role="status">
              <span>{message}</span>
              <button aria-label="Fermer le message" onClick={() => setMessage('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {screen && !sharedAudio && (
            <p className="source-audio-note">
              <VolumeX size={14} /> Aucun audio de partage détecté. Le micro reste indépendant.
            </p>
          )}
          <div className="participants-strip">
            {participants.map((p) => {
              const camera = p.getTrackPublication(Track.Source.Camera)?.track;
              return (
                <div
                  className={`participant-tile ${p.isSpeaking ? 'speaking' : ''}`}
                  key={p.identity || 'local'}
                >
                  {camera &&
                  !chat.blocked.has(p.identity) &&
                  (!lowCamera || !sharer || p.isLocal) ? (
                    <VideoView track={camera} mirror={p.isLocal} className="camera-video" />
                  ) : (
                    <div className="tile-avatar">{initial(p.name || 'Mate')}</div>
                  )}
                  <div className="tile-caption">
                    <span>
                      {p.name || 'Connexion…'}
                      {p.isLocal ? ' (toi)' : ''}
                    </span>
                    {p.isMicrophoneEnabled ? <Mic size={12} /> : <MicOff size={12} />}
                  </div>
                  {isHost(p) && <span className="host-chip">Hôte</span>}
                </div>
              );
            })}
          </div>
          {session.chat && (
            <div className="reaction-bar" aria-label="Réactions du salon">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => void chat.react(emoji)}
                  aria-label={`Réagir ${emoji}`}
                  disabled={!connected}
                >
                  {emoji}
                </button>
              ))}
              {chat.error && tab !== 'chat' && <span role="status">{chat.error}</span>}
            </div>
          )}
          <div className="room-toolbar">
            <div className="device-controls">
              <button
                className={`control-button ${local.isMicrophoneEnabled ? 'active' : ''}`}
                aria-label={local.isMicrophoneEnabled ? 'Couper le micro' : 'Activer le micro'}
                onClick={() => void toggleDevice('mic')}
                disabled={!connected}
              >
                {local.isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                className={`control-button ${local.isCameraEnabled ? 'active' : ''}`}
                aria-label={local.isCameraEnabled ? 'Couper la caméra' : 'Activer la caméra'}
                onClick={() => void toggleDevice('camera')}
                disabled={!connected}
              >
                {local.isCameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </div>
            <span className="toolbar-divider" />
            {control.eligible ? (
              <button
                className={`share-button ${local.isScreenShareEnabled ? 'sharing' : ''}`}
                onClick={toggleShare}
                disabled={
                  !connected ||
                  busy ||
                  !supported ||
                  (session.controls && (control.busy || !!control.snapshot?.busy))
                }
              >
                {busy ? (
                  <LoaderCircle size={18} className="spin" />
                ) : local.isScreenShareEnabled ? (
                  <MonitorOff size={18} />
                ) : (
                  <MonitorUp size={18} />
                )}
                <span>
                  {local.isScreenShareEnabled ? 'Arrêter le partage' : 'Partager l’écran'}
                </span>
              </button>
            ) : (
              <span className="audience-label">
                <Headphones size={17} /> Tu es dans le public
              </span>
            )}
            <button
              className={`control-button panel-toggle ${panelOpen ? 'active' : ''}`}
              aria-label={
                panelOpen ? 'Fermer le panneau du salon' : 'Ouvrir le chat et les participants'
              }
              aria-expanded={panelOpen}
              aria-controls="room-panel"
              onClick={() => setPanelOpen((v) => !v)}
            >
              <MessageCircle size={20} />
              {chat.unread > 0 && <b className="unread-dot">{chat.unread}</b>}
            </button>
            <button className="leave-button" onClick={() => void leave()}>
              <PhoneOff size={19} />
              <span>Quitter</span>
            </button>
          </div>
          {!audioAllowed && (
            <button
              className="button primary audio-unlock"
              onClick={() =>
                void room
                  .startAudio()
                  .catch(() => setMessage('Clique à nouveau pour autoriser le son.'))
              }
            >
              <Volume2 size={17} /> Activer le son du salon
            </button>
          )}
        </section>
        <aside
          className={`room-sidebar ${panelOpen ? 'panel-open' : ''}`}
          id="room-panel"
          aria-label="Conversation et réglages"
        >
          <div className="mobile-panel-heading">
            <strong>Le salon, côté coulisses.</strong>
            <button
              className="icon-button"
              aria-label="Fermer le panneau"
              onClick={() => setPanelOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="sidebar-tabs">
            {session.chat && (
              <button className={tab === 'chat' ? 'selected' : ''} onClick={() => setTab('chat')}>
                <MessageCircle size={15} /> Chat {chat.unread > 0 && <span>{chat.unread}</span>}
              </button>
            )}
            <button className={tab === 'people' ? 'selected' : ''} onClick={() => setTab('people')}>
              <Users size={16} /> Mates <span>{participants.length}</span>
            </button>
            <button
              className={tab === 'quality' ? 'selected' : ''}
              onClick={() => setTab('quality')}
            >
              <Activity size={16} /> Qualité
            </button>
          </div>
          {tab === 'chat' ? (
            <ChatPanel
              messages={chat.messages}
              identity={session.identity}
              sending={chat.sending}
              loading={chat.loading}
              error={chat.error}
              hasOlder={chat.hasOlder}
              onOlder={chat.older}
              onSend={chat.send}
            />
          ) : tab === 'people' ? (
            <>
              <div className="people-list">
                {participants.map((p) => (
                  <div className="person" key={p.identity || 'local'}>
                    <div className="person-avatar">{initial(p.name || 'Mate')}</div>
                    <div>
                      <strong>
                        {p.name || 'Connexion…'}
                        {p.isLocal ? ' · toi' : ''}
                      </strong>
                      <span>{isHost(p) ? 'Hôte du salon' : 'Ici pour le moment'}</span>
                    </div>
                    <span
                      className={`quality-dot ${p.connectionQuality}`}
                      title={`Connexion : ${p.connectionQuality}`}
                    />
                    {session.chat && !p.isLocal && (
                      <button
                        className="person-block"
                        onClick={() => void chat.toggleBlock(p.identity)}
                      >
                        {chat.blocked.has(p.identity) ? 'Débloquer' : 'Bloquer'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {session.controls && (
                <RoomControlsPanel
                  snapshot={control.snapshot}
                  people={participants}
                  busy={control.busy}
                  command={async (action, target) => {
                    if (action === 'close') leaving.current = true;
                    const ok = await control.command(action, target);
                    if (action === 'close' && ok) onLeave();
                    else if (action === 'close') leaving.current = false;
                  }}
                />
              )}
              <div className="sidebar-intro">
                <span className="feature-icon lime">
                  <Headphones size={20} />
                </span>
                <h3>Le début de quelque chose.</h3>
                <p>
                  Un pseudo, une passion, des gens à découvrir. Prends la parole à ton rythme et
                  fais comme chez toi.
                </p>
                <Link href="/lab" target="_blank" rel="noopener noreferrer">
                  Vérifier mon partage <ArrowUpRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <QualityPanel track={screen} local={localShare} />
              <section className="settings-panel">
                <h3>
                  <SlidersHorizontal size={16} /> Réglages
                </h3>
                {control.eligible && (
                  <>
                    <label htmlFor="profile">Profil de diffusion</label>
                    <select
                      id="profile"
                      value={profile}
                      onChange={(e) => setProfile(e.target.value as MediaProfile)}
                      disabled={local.isScreenShareEnabled || busy}
                    >
                      {Object.entries(PROFILES).map(([id, p]) => (
                        <option value={id} key={id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <p className="small muted">
                      {PROFILES[profile].description}. Arrête le partage pour changer de profil.
                    </p>
                  </>
                )}
                <label htmlFor="content-volume">
                  Son du contenu <span>{contentVolume}%</span>
                </label>
                <input
                  id="content-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={contentVolume}
                  onChange={(e) => setContentVolume(Number(e.target.value))}
                />
                <label htmlFor="voice-volume">
                  Voix des mates <span>{voiceVolume}%</span>
                </label>
                <input
                  id="voice-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={lowCamera}
                    onChange={(e) => setLowCamera(e.target.checked)}
                  />
                  Suspendre les caméras reçues pendant un partage
                </label>
                <p className="small muted">Préserve la bande passante pour la scène.</p>
                <DeviceSettings room={room} />
              </section>
            </>
          )}
          <div className="sidebar-bottom">
            <span className="tiny-badge">LE MOMENT EST À VOUS</span>
            <p>
              Pas d’enregistrement par Mates.
              <br />
              Ton pseudo est visible des participants.
            </p>
          </div>
        </aside>
      </div>
      {!supported && control.eligible && (
        <div className="compatibility-note">
          Le partage nécessite un navigateur compatible sur ordinateur et HTTPS (ou localhost).
        </div>
      )}
      {[...room.remoteParticipants.values()].flatMap((p) =>
        [...p.audioTrackPublications.values()].map((pub) =>
          pub.track && !(screen && pub === sharedAudio) ? (
            <AudioView
              key={pub.trackSid}
              track={pub.track as RemoteAudioTrack}
              volume={
                chat.blocked.has(p.identity)
                  ? 0
                  : (pub.source === Track.Source.ScreenShareAudio ? contentVolume : voiceVolume) /
                    100
              }
            />
          ) : null,
        ),
      )}
    </main>
  );
}
