import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  const requestId = crypto.randomUUID();
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: { code: error.code, message: error.message, requestId } },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: error.issues[0]?.message || 'Données invalides.',
          requestId,
        },
      },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Requête JSON invalide.', requestId } },
      { status: 400 },
    );
  // Pas de jetons, corps de requête, clés ou détails fournisseur dans les logs.
  console.error(
    '[mates] request failed',
    requestId,
    error instanceof Error ? error.name : 'UnknownError',
  );
  return NextResponse.json(
    {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Le service média est indisponible. Vérifie la configuration et réessaie.',
        requestId,
      },
    },
    { status: 503 },
  );
}
export function validateMutation(req: NextRequest) {
  const expected = process.env.APP_ORIGIN || req.nextUrl.origin;
  if (req.headers.get('origin') !== expected)
    throw new ApiError(403, 'ORIGIN_DENIED', 'Origine de la requête refusée.');
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, 'JSON_REQUIRED', 'Le format JSON est requis.');
  const length = Number(req.headers.get('content-length') || 0);
  if (length > 4096) throw new ApiError(413, 'BODY_TOO_LARGE', 'Requête trop volumineuse.');
}
export async function readJson(req: NextRequest) {
  const body = await req.text();
  if (body.length > 4096) throw new ApiError(413, 'BODY_TOO_LARGE', 'Requête trop volumineuse.');
  return JSON.parse(body);
}
// Limiteur de confort pour le prototype mono-instance. Ne remplace pas un quota distribué.
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs = 60000, now = Date.now()) {
  for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  if (buckets.size > 10000) throw new ApiError(429, 'RATE_LIMITED', 'Réessaie dans une minute.');
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (current.count >= max)
    throw new ApiError(429, 'RATE_LIMITED', 'Trop de tentatives. Réessaie dans une minute.');
  current.count++;
}
