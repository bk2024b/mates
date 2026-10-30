/** Diagnostics réduits à des catégories fixes ; aucune URL, réponse brute ou donnée de formulaire. */
const names = new Set([
  'AuthUnknownError',
  'AuthRetryableFetchError',
  'AuthApiError',
  'AuthSessionMissingError',
  'TypeError',
  'SyntaxError',
  'Error',
  'AbortError',
  'TimeoutError',
]);
const networkCodes = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);
function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
export function errorDiagnostic(error: unknown) {
  const e = record(error);
  const inner = record(e.originalError ?? e.cause);
  const nested = record(inner.cause);
  const errorName = typeof e.name === 'string' && names.has(e.name) ? e.name : 'OtherError';
  const causeName =
    typeof inner.name === 'string' && names.has(inner.name) ? inner.name : undefined;
  const code = inner.code ?? nested.code;
  const networkCode = typeof code === 'string' && networkCodes.has(code) ? code : undefined;
  const text = [e.message, inner.message].filter((v) => typeof v === 'string').join(' ');
  const reason = /cookies can only be modified|cookies.*outside a request|request scope/i.test(text)
    ? 'COOKIE_CONTEXT'
    : causeName === 'SyntaxError'
      ? 'INVALID_JSON'
      : networkCode
        ? 'NETWORK'
        : errorName === 'AuthRetryableFetchError'
          ? 'RETRYABLE_TRANSPORT'
          : 'UNCLASSIFIED';
  return { errorName, causeName, networkCode, reason };
}
export const diagnosticFetch: typeof fetch = async (input, init) => {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    console.warn('[mates:auth:transport]', errorDiagnostic(error));
    throw error;
  }
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.toLowerCase().includes('json')) {
    console.warn('[mates:auth:http]', {
      status: response.status,
      responseType: type.toLowerCase().includes('json')
        ? 'json'
        : type.toLowerCase().includes('html')
          ? 'html'
          : 'other',
    });
  }
  return response;
};
