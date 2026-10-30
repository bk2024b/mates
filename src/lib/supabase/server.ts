import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseSettings } from '../identity-mode';
/** Routes uniquement : aucune lecture de session dans un composant serveur mis en cache. */
export async function supabaseServer() {
  const { url, key } = supabaseSettings();
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(values) {
        for (const { name, value, options } of values)
          store.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
          });
      },
    },
  });
}
