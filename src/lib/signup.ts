import type { User } from '@supabase/supabase-js';
export function signupIsConnected(
  user: Pick<User, 'is_anonymous' | 'email_confirmed_at'> | null,
  hasSession: boolean,
) {
  return hasSession && user?.is_anonymous === false && !!user.email_confirmed_at;
}
