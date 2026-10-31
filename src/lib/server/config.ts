import { identityMode } from '../identity-mode';
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
  let mode: 'prototype' | 'supabase' = 'prototype';
  try {
    mode = identityMode();
  } catch {
    missing.push('MATES_IDENTITY_MODE (prototype ou supabase)');
  }
  if (mode === 'supabase') {
    for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'])
      if (!process.env[key]?.trim()) missing.push(key);
  }
  if (
    process.env.MATES_ROOM_CONTROLS === 'enabled' &&
    (mode !== 'supabase' || !process.env.SUPABASE_SECRET_KEY?.trim())
  )
    missing.push('SUPABASE_SECRET_KEY et mode supabase requis pour les commandes');
  if (process.env.MATES_ROOM_CONTROLS === 'enabled') {
    try {
      if (!new URL(process.env.LIVEKIT_URL || '').hostname.endsWith('.livekit.cloud'))
        missing.push('LIVEKIT_URL LiveKit Cloud requis pour les commandes');
    } catch {}
  }
  if (
    process.env.MATES_CHAT === 'enabled' &&
    (mode !== 'supabase' || !process.env.SUPABASE_SECRET_KEY?.trim())
  )
    missing.push('SUPABASE_SECRET_KEY et mode supabase requis pour le chat');
  return { configured: missing.length === 0, missing, version: '0.5.0', identityMode: mode };
}
export function livekitConfig() {
  if (!configuration().configured) throw new Error('MATES_NOT_CONFIGURED');
  return {
    url: process.env.LIVEKIT_URL!,
    key: process.env.LIVEKIT_API_KEY!,
    secret: process.env.LIVEKIT_API_SECRET!,
  };
}
