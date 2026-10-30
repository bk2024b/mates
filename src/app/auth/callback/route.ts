import { NextRequest, NextResponse } from 'next/server';
import { safeNext, identityMode } from '@/lib/identity-mode';
import { supabaseServer } from '@/lib/supabase/server';
export async function GET(req: NextRequest) {
  const origin = process.env.APP_ORIGIN || req.nextUrl.origin;
  const next = safeNext(req.nextUrl.searchParams.get('next'));
  const code = req.nextUrl.searchParams.get('code');
  if (identityMode() === 'supabase' && code) {
    try {
      const client = await supabaseServer();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(new URL(next, origin), {
          headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch {
      /* Ne pas journaliser le code reçu dans l’URL. */
    }
  }
  return NextResponse.redirect(new URL('/account?error=confirmation', origin), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
