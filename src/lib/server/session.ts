import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
export const COOKIE_NAME = 'mates_session';
export const SESSION_SECONDS = 86400;
export type Session = { id: string; exp: number };
function secret() {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Session secret unavailable');
  return value;
}
export function signSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export function readSession(value?: string, now = Date.now()): Session | null {
  if (!value || value.length > 1024) return null;
  try {
    const [payload, mac, extra] = value.split('.');
    if (!payload || !mac || extra) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest();
    const supplied = Buffer.from(mac, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!parsed || typeof parsed !== 'object' || !('id' in parsed) || !('exp' in parsed))
      return null;
    const { id, exp } = parsed;
    return typeof id === 'string' &&
      /^[0-9a-f-]{36}$/.test(id) &&
      typeof exp === 'number' &&
      exp > now / 1000
      ? { id, exp }
      : null;
  } catch {
    return null;
  }
}
export function newSession(): Session {
  return { id: randomUUID(), exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
}
