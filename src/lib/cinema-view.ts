export type CinemaOrientation = {
  lock?: (orientation: 'landscape') => Promise<void>;
  unlock?: () => void;
};
export async function requestCinemaLandscape(
  target: { requestFullscreen?: (options?: FullscreenOptions) => Promise<void> },
  doc: Pick<Document, 'fullscreenElement'>,
  orientation: CinemaOrientation,
): Promise<'locked' | 'manual'> {
  try {
    if (!doc.fullscreenElement && target.requestFullscreen)
      await target.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* Rotation may still be available in an installed app. */
  }
  try {
    if (orientation.lock) {
      await orientation.lock('landscape');
      return 'locked';
    }
  } catch {
    /* Browser or device policy requires the user to rotate manually. */
  }
  return 'manual';
}
export function cinemaReady(metadata: string | undefined) {
  try {
    return JSON.parse(metadata || '{}').cinemaReady === true;
  } catch {
    return false;
  }
}
export function cinemaHost(metadata: string | undefined) {
  try {
    return JSON.parse(metadata || '{}').role === 'host';
  } catch {
    return false;
  }
}

export function unlockCinemaOrientation(orientation: CinemaOrientation | undefined) {
  try {
    orientation?.unlock?.();
  } catch {
    /* A hidden document or browser policy can refuse the release. */
  }
}
