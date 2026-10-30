import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { identityMode } from '@/lib/identity-mode';
import { supabaseServer } from '@/lib/supabase/server';
import { canCreate } from '@/lib/server/identity';
import { ApiError, failure, rateLimit, readJson, validateMutation } from '@/lib/server/http';
import { nicknameSchema } from '@/lib/contracts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function json(data: unknown) {
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
}
const credentials = z.object({ email: z.email().max(254), password: z.string().min(8).max(128) });
function enabled() {
  if (identityMode() !== 'supabase')
    throw new ApiError(
      409,
      'AUTH_DISABLED',
      'Les comptes ne sont pas encore activés sur ce déploiement.',
    );
}
export async function GET(_req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    if ((await params).action !== 'session')
      throw new ApiError(404, 'NOT_FOUND', 'Route introuvable.');
    if (identityMode() !== 'supabase') return json({ mode: 'prototype', user: null });
    const client = await supabaseServer();
    const { data, error } = await client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError')
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Impossible de vérifier la session. Réessaie.');
    if (!data.user) return json({ mode: 'supabase', user: null });
    const profile = await client
      .from('profiles')
      .select('nickname,avatar_seed')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profile.error)
      throw new ApiError(
        503,
        'DATABASE_UNAVAILABLE',
        'Vérifie la migration Supabase avant de continuer.',
      );
    // Pas d’email ni de jeton dans cette projection utilisée par l’interface.
    return json({
      mode: 'supabase',
      user: {
        nickname: profile.data?.nickname || '',
        anonymous: !!data.user.is_anonymous,
        canCreate: canCreate(data.user),
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    validateMutation(req);
    enabled();
    const { action } = await params;
    if (!['login', 'signup', 'logout', 'recover', 'password'].includes(action))
      throw new ApiError(404, 'NOT_FOUND', 'Route introuvable.');
    rateLimit(`auth:${action}:global`, 30);
    const body = await readJson(req);
    const client = await supabaseServer();
    if (action === 'login') {
      const input = credentials.parse(body);
      const { error } = await client.auth.signInWithPassword(input);
      if (error)
        throw new ApiError(
          401,
          'LOGIN_FAILED',
          'Connexion refusée. Vérifie tes identifiants et la confirmation de ton email.',
        );
      return json({ ok: true });
    }
    if (action === 'signup') {
      const input = credentials.extend({ nickname: nicknameSchema }).parse(body);
      const { data: current, error: currentError } = await client.auth.getUser();
      if (currentError && currentError.name !== 'AuthSessionMissingError')
        throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Impossible de vérifier la session actuelle.');
      if (current.user && !current.user.is_anonymous)
        throw new ApiError(409, 'ALREADY_SIGNED_IN', 'Tu es déjà connecté à un compte.');
      const redirect = `${process.env.APP_ORIGIN || req.nextUrl.origin}/auth/callback`;
      // Une conversion d’invité conserve son UUID et ses participations.
      const result = current.user?.is_anonymous
        ? await client.auth.updateUser(
            { email: input.email, password: input.password, data: { nickname: input.nickname } },
            { emailRedirectTo: redirect },
          )
        : await client.auth.signUp({
            email: input.email,
            password: input.password,
            options: { data: { nickname: input.nickname }, emailRedirectTo: redirect },
          });
      if (result.error)
        throw new ApiError(
          400,
          'SIGNUP_FAILED',
          'Inscription impossible. Vérifie les informations ou essaie de te connecter.',
        );
      return json({
        ok: true,
        message:
          'Consulte ton email pour confirmer ton compte, puis connecte-toi. Si le compte existe déjà, utilise la connexion ou la récupération du mot de passe.',
      });
    }
    if (action === 'recover') {
      const input = z.object({ email: z.email().max(254) }).parse(body);
      const { error } = await client.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${process.env.APP_ORIGIN || req.nextUrl.origin}/auth/callback?next=${encodeURIComponent('/account?reset=1')}`,
      });
      if (error)
        throw new ApiError(
          503,
          'AUTH_UNAVAILABLE',
          'La récupération est indisponible. Réessaie plus tard.',
        );
      return json({
        ok: true,
        message:
          'Si cette adresse correspond à un compte, un lien de récupération lui sera envoyé.',
      });
    }
    if (action === 'password') {
      const { password } = z.object({ password: z.string().min(8).max(128) }).parse(body);
      const { data, error } = await client.auth.getUser();
      if (error || !canCreate(data.user))
        throw new ApiError(
          401,
          'UNAUTHORIZED',
          'Ouvre d’abord le lien de récupération ou reconnecte-toi.',
        );
      const result = await client.auth.updateUser({ password });
      if (result.error)
        throw new ApiError(
          400,
          'PASSWORD_FAILED',
          'Le mot de passe n’a pas pu être modifié. Une nouvelle vérification peut être nécessaire.',
        );
      return json({ ok: true, message: 'Mot de passe mis à jour.' });
    }
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error)
      throw new ApiError(503, 'LOGOUT_FAILED', 'La déconnexion n’a pas pu être confirmée.');
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
