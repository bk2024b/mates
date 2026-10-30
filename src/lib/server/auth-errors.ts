import { ApiError } from './http';
type ProviderError = { code?: string; status?: number };
/** Traductions contrôlées : jamais de message brut, email, mot de passe ou jeton du fournisseur. */
const messages: Record<string, { status: number; message: string }> = {
  email_address_not_authorized: {
    status: 503,
    message:
      'L’envoi des emails de confirmation n’est pas configuré pour cette adresse. L’administrateur doit configurer le service email.',
  },
  over_email_send_rate_limit: {
    status: 429,
    message:
      'La limite d’envoi des emails est atteinte. Attends avant de réessayer ou contacte l’administrateur.',
  },
  over_request_rate_limit: {
    status: 429,
    message: 'Trop de tentatives. Patiente un moment avant de réessayer.',
  },
  signup_disabled: {
    status: 403,
    message: 'Les nouvelles inscriptions sont désactivées. Contacte l’administrateur.',
  },
  email_provider_disabled: {
    status: 503,
    message: 'L’inscription par email n’est pas activée sur ce site.',
  },
  email_address_invalid: {
    status: 400,
    message: 'Cette adresse email n’est pas acceptée. Vérifie son orthographe.',
  },
  weak_password: {
    status: 400,
    message:
      'Ce mot de passe ne satisfait pas les règles du site. Choisis un mot de passe plus long et moins courant.',
  },
  captcha_failed: {
    status: 400,
    message:
      'La vérification anti-robot requise n’a pas été validée. Contacte l’administrateur si aucun formulaire de vérification n’apparaît.',
  },
  anonymous_provider_disabled: {
    status: 503,
    message: 'L’accès invité n’est pas activé sur ce site.',
  },
  manual_linking_disabled: {
    status: 503,
    message: 'La conversion de cette identité invitée en compte n’est pas activée sur ce site.',
  },
  email_exists: {
    status: 400,
    message: 'Inscription impossible. Essaie de te connecter ou de récupérer ton mot de passe.',
  },
  user_already_exists: {
    status: 400,
    message: 'Inscription impossible. Essaie de te connecter ou de récupérer ton mot de passe.',
  },
  email_not_confirmed: {
    status: 401,
    message: 'Confirme ton adresse email avant de te connecter.',
  },
  invalid_credentials: {
    status: 401,
    message:
      'Connexion refusée. Vérifie tes identifiants ou utilise la récupération du mot de passe.',
  },
};
export function authFailure(
  error: ProviderError,
  operation: 'signup' | 'login' | 'recover' | 'password',
): ApiError {
  const providerCode = error.code && /^[a-z_]{1,80}$/.test(error.code) ? error.code : 'unknown';
  // Diagnostic du déploiement uniquement. Ne jamais ajouter error.message ni le corps de la requête.
  console.warn('[mates:auth]', { operation, providerCode, status: error.status });
  const known = messages[providerCode];
  if (known) return new ApiError(known.status, `AUTH_${providerCode.toUpperCase()}`, known.message);
  const status = error.status === 429 ? 429 : 503;
  return new ApiError(
    status,
    'AUTH_PROVIDER_ERROR',
    status === 429
      ? 'Le service a reçu trop de demandes. Réessaie plus tard.'
      : 'Le service de compte n’a pas pu finaliser cette demande. Réessaie plus tard ou contacte l’administrateur.',
  );
}
