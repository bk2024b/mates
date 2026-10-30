import {
  ScreenSharePresets,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
  type RoomOptions,
  VideoPresets,
} from 'livekit-client';
import type { MediaProfile } from './contracts';
export const PROFILES = {
  motion: {
    label: 'Vidéo fluide',
    fps: 30,
    bitrate: 6_000_000,
    hint: 'motion',
    description: '1080p · cible 30 images/s',
  },
  detail: {
    label: 'Texte net',
    fps: 15,
    bitrate: 3_000_000,
    hint: 'detail',
    description: '1080p · cible 15 images/s',
  },
} as const;
export function captureOptions(profile: MediaProfile): ScreenShareCaptureOptions {
  return {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 2,
    },
    video: { displaySurface: 'browser' },
    resolution: { width: 1920, height: 1080, frameRate: PROFILES[profile].fps },
    contentHint: PROFILES[profile].hint,
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
    systemAudio: 'include',
  };
}
export function publishOptions(profile: MediaProfile): TrackPublishOptions {
  return {
    stream: 'mates-screen',
    forceStereo: true,
    videoCodec: 'vp8',
    simulcast: true,
    screenShareEncoding: {
      maxBitrate: PROFILES[profile].bitrate,
      maxFramerate: PROFILES[profile].fps,
    },
    screenShareSimulcastLayers: [ScreenSharePresets.h720fps15],
    degradationPreference: profile === 'motion' ? 'maintain-framerate' : 'maintain-resolution',
    audioPreset: { maxBitrate: 128_000 },
    dtx: false,
    red: true,
  };
}
export const roomOptions: RoomOptions = {
  adaptiveStream: { pixelDensity: 'screen' },
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
  audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  publishDefaults: {
    videoCodec: 'vp8',
    videoEncoding: { maxBitrate: 300_000, maxFramerate: 15 },
    simulcast: true,
  },
};
export function captureError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
    return 'Partage annulé ou permission refusée. Tu peux réessayer.';
  if (name === 'NotReadableError')
    return 'Impossible de capturer cette source. Vérifie les permissions du système et réessaie avec un onglet.';
  if (name === 'NotFoundError') return 'Aucune source disponible sur cet appareil.';
  return 'La capture n’a pas pu démarrer. Réessaie avec Chrome ou Edge sur ordinateur.';
}
