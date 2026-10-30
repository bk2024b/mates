export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiRequestError(
      data.error?.message || 'Une erreur est survenue.',
      data.error?.code || 'UNKNOWN',
    );
  return data as T;
}
