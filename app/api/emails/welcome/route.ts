import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendAndLog } from '@/lib/emails/send';
import { renderWelcome } from '@/lib/emails/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Triggered by the login page just after a successful signup. Idempotent:
 * if a welcome was already sent (logged), it just returns ok.
 */
export async function POST(request: Request) {
  // Auth check via Supabase session cookie. We only welcome the *logged-in*
  // user — anyone else trying to spam this endpoint gets 401.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // Locale comes from the body, default fr (matches site default).
  let locale: 'fr' | 'en' = 'fr';
  try {
    const body = await request.json();
    if (body?.locale === 'en') locale = 'en';
  } catch {
    // body is optional
  }

  const { subject, html, text } = renderWelcome({ userId: user.id, locale });
  const result = await sendAndLog({
    to: user.email,
    userId: user.id,
    type: 'welcome',
    subject,
    html,
    text,
  });

  return Response.json(result);
}
