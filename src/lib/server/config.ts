export function configuration() {
  const missing = [
    'LIVEKIT_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'APP_SESSION_SECRET',
  ].filter((key) => !process.env[key]?.trim());
  if (process.env.APP_SESSION_SECRET && process.env.APP_SESSION_SECRET.length < 32)
    missing.push('APP_SESSION_SECRET (32 caractères minimum)');
  try {
    const u = new URL(process.env.LIVEKIT_URL || '');
    if (!['ws:', 'wss:'].includes(u.protocol)) missing.push('LIVEKIT_URL (ws ou wss)');
  } catch {
    if (process.env.LIVEKIT_URL) missing.push('LIVEKIT_URL (URL invalide)');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN) missing.push('APP_ORIGIN');
  return { configured: missing.length === 0, missing, version: '0.1.0' };
}
export function livekitConfig() {
  if (!configuration().configured) throw new Error('MATES_NOT_CONFIGURED');
  return {
    url: process.env.LIVEKIT_URL!,
    key: process.env.LIVEKIT_API_KEY!,
    secret: process.env.LIVEKIT_API_SECRET!,
  };
}
