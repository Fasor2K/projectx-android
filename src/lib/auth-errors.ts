import { t } from '@/lib/i18n';

/** Messaggi tradotti per gli errori di Supabase Auth più comuni. */
export function authErrorMessage(code: string | undefined) {
  switch (code) {
    case 'invalid_credentials':
      return t('authErrors.invalidCredentials');
    case 'email_not_confirmed':
      return t('authErrors.emailNotConfirmed');
    case 'user_already_exists':
    case 'email_exists':
      return t('authErrors.userExists');
    case 'weak_password':
      return t('authErrors.weakPassword', { min: 8 });
    case 'same_password':
      return t('authErrors.samePassword');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return t('authErrors.rateLimit');
    default:
      return t('authErrors.generic');
  }
}
