import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { identityMode, type IdentityMode } from '../identity-mode';
import { supabaseServer } from '../supabase/server';
import { ApiError } from './http';
import {
  COOKIE_NAME,
  SESSION_SECONDS,
  newSession,
  readSession,
  signSession,
  type Session,
} from './session';
export type RequestIdentity = {
  id: string;
  mode: IdentityMode;
  client?: SupabaseClient;
  user?: User;
  legacySession?: Session;
};
export function canCreate(
  user: Pick<User, 'is_anonymous' | 'email_confirmed_at'> | null | undefined,
) {
  return !!user && user.is_anonymous === false && !!user.email_confirmed_at;
}
export async function resolveIdentity(
  req: NextRequest,
  name: string,
  purpose: 'create' | 'join',
  mode = identityMode(),
): Promise<RequestIdentity> {
  if (mode === 'prototype') {
    const session = readSession(req.cookies.get(COOKIE_NAME)?.value) || newSession();
    return { id: session.id, mode, legacySession: session };
  }
  const client = await supabaseServer();
  const { data, error } = await client.auth.getUser();
  let user = data.user;
  if (error && error.name !== 'AuthSessionMissingError')
    throw new ApiError(
      503,
      'AUTH_UNAVAILABLE',
      'Impossible de vérifier la session. Réessaie sans changer d’identité.',
    );
  // Une session invalide n’est jamais utilisée pour accorder des permissions.
  if (!user && purpose === 'join') {
    const result = await client.auth.signInAnonymously();
    if (result.error || !result.data.user)
      throw new ApiError(
        503,
        'ANONYMOUS_UNAVAILABLE',
        'L’accès invité est indisponible. Vérifie l’activation des connexions anonymes dans Supabase.',
      );
    user = result.data.user;
  }
  if (purpose === 'create' && (!user || error || !canCreate(user)))
    throw new ApiError(
      401,
      'ACCOUNT_REQUIRED',
      'Connecte-toi à un compte avec une adresse email confirmée pour créer un salon.',
    );
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Reconnecte-toi pour continuer.');
  // Un UPSERT incluant id exigerait un droit UPDATE(id), volontairement absent.
  const existing = await client.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing.error)
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Le profil n’a pas pu être lu. Vérifie la migration Supabase.',
    );
  let profile = existing.data
    ? await client.from('profiles').update({ nickname: name }).eq('id', user.id)
    : await client.from('profiles').insert({ id: user.id, nickname: name });
  if (profile.error?.code === '23505')
    profile = await client.from('profiles').update({ nickname: name }).eq('id', user.id);
  if (profile.error)
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Le profil n’a pas pu être enregistré. Vérifie la migration Supabase.',
    );
  return { id: user.id, mode, client, user };
}
export function applyIdentityCookie(
  response: NextResponse,
  req: NextRequest,
  identity: RequestIdentity,
) {
  if (identity.legacySession)
    response.cookies.set(COOKIE_NAME, signSession(identity.legacySession), {
      httpOnly: true,
      sameSite: 'strict',
      secure: req.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: SESSION_SECONDS,
    });
}
export async function persistRoom(identity: RequestIdentity, id: string, title: string) {
  if (!identity.client) return;
  const { error } = await identity.client.from('rooms').insert({ id, host_id: identity.id, title });
  if (error)
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Impossible d’enregistrer le salon. Vérifie la migration Supabase.',
    );
}
export async function enroll(identity: RequestIdentity, roomId: string, hostIdentity: string) {
  if (!identity.client) return;
  const { data, error } = await identity.client.rpc('join_mates_room', { p_room_id: roomId });
  if (error || data !== hostIdentity)
    throw new ApiError(403, 'ROOM_ACCESS_DENIED', 'L’accès à ce salon n’a pas pu être confirmé.');
}
