/** Messaggi in italiano per gli errori di Supabase Auth più comuni. */
export function authErrorMessage(code: string | undefined) {
  switch (code) {
    case 'invalid_credentials':
      return 'Email o password non corrette.';
    case 'email_not_confirmed':
      return "Conferma la tua email con il link che ti abbiamo inviato, poi riprova.";
    case 'user_already_exists':
    case 'email_exists':
      return 'Esiste già un account con questa email.';
    case 'weak_password':
      return 'La password è troppo debole: usa almeno 8 caratteri.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Troppi tentativi. Riprova tra qualche minuto.';
    default:
      return 'Qualcosa è andato storto. Controlla la connessione e riprova.';
  }
}
