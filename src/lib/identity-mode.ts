export type IdentityMode = 'prototype' | 'supabase';
export function identityMode(): IdentityMode {
  const mode = process.env.MATES_IDENTITY_MODE || 'prototype';
  if (mode !== 'prototype' && mode !== 'supabase') throw new Error('INVALID_IDENTITY_MODE');
  return mode;
}
export function supabaseSettings() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');
  return { url, key };
}
export function safeNext(value: string | null | undefined): string {
  if (value === '/' || value === '/account' || value === '/account?reset=1') return value;
  return value && /^\/room\/mates-[a-f0-9]{24}$/.test(value) ? value : '/';
}
