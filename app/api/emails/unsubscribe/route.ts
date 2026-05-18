import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/emails/unsubscribe-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// HTML response so the user lands on a friendly confirmation page, not a JSON blob.
function htmlPage(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
           background: #0a0118; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
           padding: 24px; }
    .card { max-width: 480px; padding: 40px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px; text-align: center; }
    h1 { margin: 0 0 12px 0; font-size: 22px; color: #fff; }
    p { margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #d1d5db; }
    a { color: #3b82f6; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://businesscoachai.app">businesscoachai.app</a>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

/**
 * One-click unsubscribe via HMAC-signed token. Handles both GET (clicked from
 * email link) and POST (Gmail/Outlook one-click via List-Unsubscribe header).
 */
async function handleUnsubscribe(userId: string | null, token: string | null) {
  if (!userId || !token) {
    return htmlPage('Lien invalide', 'Le lien de désabonnement est incomplet ou expiré.');
  }
  if (!verifyUnsubscribeToken(userId, token)) {
    return htmlPage('Lien invalide', 'Ce lien de désabonnement n\'est pas valide.');
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('user_subscriptions')
    .update({ email_optout: true })
    .eq('user_id', userId);
  if (error) {
    return htmlPage(
      'Erreur',
      'Une erreur est survenue. Réessaie plus tard ou écris-nous à buisnesscoachia@gmail.com.'
    );
  }

  return htmlPage(
    'Désabonnement confirmé',
    'Tu ne recevras plus d\'emails de relance. Les emails strictement liés à ton compte (confirmation, reset mot de passe, facturation) continueront d\'arriver.'
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleUnsubscribe(url.searchParams.get('u'), url.searchParams.get('t'));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  return handleUnsubscribe(url.searchParams.get('u'), url.searchParams.get('t'));
}
