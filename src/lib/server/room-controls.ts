import { createClient } from '@supabase/supabase-js';
import { TrackSource, type RoomServiceClient, type ParticipantInfo } from 'livekit-server-sdk';
import { supabaseSettings } from '../identity-mode';
import { ApiError } from './http';
export function controlsEnabled() {
  return process.env.MATES_ROOM_CONTROLS === 'enabled';
}
export function controlDatabase() {
  const { url } = supabaseSettings();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key)
    throw new ApiError(
      503,
      'CONTROLS_NOT_CONFIGURED',
      'Les commandes du salon ne sont pas configurées.',
    );
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const screenSources = [
  TrackSource.MICROPHONE,
  TrackSource.CAMERA,
  TrackSource.SCREEN_SHARE,
  TrackSource.SCREEN_SHARE_AUDIO,
];
export const basicSources = [TrackSource.MICROPHONE, TrackSource.CAMERA];
export function hasScreen(p: ParticipantInfo) {
  return p.tracks.some(
    (t) => t.source === TrackSource.SCREEN_SHARE || t.source === TrackSource.SCREEN_SHARE_AUDIO,
  );
}
/** Retirer les sources interdites puis vérifier leur disparition avant tout nouveau diffuseur. */
export async function revokeScreens(
  service: RoomServiceClient,
  roomId: string,
  identities: string[],
) {
  for (const identity of [...new Set(identities)]) {
    // LiveKit Cloud : révoquer aussi les jetons rafraîchis d’une identité déjà déconnectée.
    await service.removeParticipant(roomId, identity, {
      revokeTokenTs: BigInt(Math.floor(Date.now() / 1000) + 1),
    });
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const people = await service.listParticipants(roomId);
    if (!people.some((p) => identities.includes(p.identity) && hasScreen(p))) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new ApiError(
    503,
    'STAGE_NOT_CLEARED',
    'L’ancienne diffusion n’a pas pu être arrêtée. L’hôte peut fermer le salon.',
  );
}
export function controlError(message: string): ApiError {
  if (/command_in_progress/.test(message))
    return new ApiError(
      409,
      'CONTROL_BUSY',
      'Une commande est déjà en cours. Réessaie dans un instant.',
    );
  if (/stage_busy/.test(message))
    return new ApiError(
      409,
      'STAGE_BUSY',
      'Quelqu’un partage déjà son écran. Attends qu’il termine.',
    );
  if (/room_closed/.test(message)) return new ApiError(410, 'ROOM_CLOSED', 'Ce salon est fermé.');
  return new ApiError(403, 'CONTROL_DENIED', 'Cette commande n’est pas autorisée.');
}

export async function closeMedia(
  service: RoomServiceClient,
  roomId: string,
  previousOwner: string | null,
) {
  try {
    const people = await service.listParticipants(roomId);
    await revokeScreens(service, roomId, [
      ...new Set([...people.map((p) => p.identity), ...(previousOwner ? [previousOwner] : [])]),
    ]);
    await service.deleteRoom(roomId);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'not_found'
    )
      return;
    throw error;
  }
}

export function controlDatabaseFailure(result: {
  status: number;
  error: { code?: string } | null;
}): ApiError {
  const code = result.error?.code;
  const providerCode = code && /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : 'unknown';
  console.warn('[mates:control:database]', { status: result.status, providerCode });
  if (result.status === 401)
    return new ApiError(
      503,
      'CONTROL_KEY_REJECTED',
      'La clé serveur Supabase est refusée. Vérifie SUPABASE_SECRET_KEY et son association au projet Supabase.',
    );
  if (result.status === 403)
    return new ApiError(
      503,
      'CONTROL_KEY_FORBIDDEN',
      'La connexion serveur Supabase ne dispose pas des droits nécessaires. Vérifie la clé secrète serveur, distincte de la clé publique.',
    );
  if (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(providerCode))
    return new ApiError(
      503,
      'CONTROL_MIGRATION_REQUIRED',
      'La migration des commandes de salon doit être appliquée.',
    );
  return new ApiError(
    503,
    'CONTROL_DATABASE_UNAVAILABLE',
    'La configuration des commandes du salon n’a pas pu être enregistrée. Consulte les logs serveur.',
  );
}
