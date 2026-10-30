import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const missing = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'APP_SESSION_SECRET',
].filter((key) => !process.env[key]?.trim());
if ((process.env.APP_SESSION_SECRET || '').length < 32 && !missing.includes('APP_SESSION_SECRET'))
  missing.push('APP_SESSION_SECRET (32 caractères minimum)');
if (/votre-projet/.test(process.env.LIVEKIT_URL || ''))
  missing.push('LIVEKIT_URL (remplacer la valeur d’exemple)');
if (process.env.MATES_IDENTITY_MODE === 'supabase') {
  for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'])
    if (!process.env[key]?.trim()) missing.push(key);
}
if (
  process.env.MATES_IDENTITY_MODE &&
  !['prototype', 'supabase'].includes(process.env.MATES_IDENTITY_MODE)
)
  missing.push('MATES_IDENTITY_MODE (prototype ou supabase)');
if (process.env.MATES_ROOM_CONTROLS === 'enabled' && !process.env.SUPABASE_SECRET_KEY?.trim())
  missing.push('SUPABASE_SECRET_KEY');
if (missing.length) {
  console.error('À configurer : ' + missing.join(', '));
  process.exitCode = 1;
} else
  console.log(
    'Variables présentes. La connexion réelle au service média reste à vérifier dans le salon.',
  );
