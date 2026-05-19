import { getResendClient, EMAIL_FROM, EMAIL_REPLY_TO } from './client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type EmailType =
  | 'welcome'
  | 'inactivity_1'
  | 'inactivity_2'
  | 'trial_d2'
  | 'trial_d1'
  | 'daily_task'
  | 'weekly_recap';

type SendInput = {
  to: string;
  userId: string;
  type: EmailType;
  subject: string;
  html: string;
  text: string;
};

type SendResult = { sent: true; messageId: string | null } | { sent: false; reason: string };

/**
 * Send a transactional email AND log it. Returns { sent: false, reason } if:
 *   - The user opted out
 *   - The same email type was sent recently (anti-duplicate guard)
 *   - Resend rejected the send
 *
 * Always safe to call from a cron loop; never throws.
 */
export async function sendAndLog(input: SendInput): Promise<SendResult> {
  const admin = getSupabaseAdmin();

  // 1) Respect opt-out (RGPD obligation)
  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('email_optout')
    .eq('user_id', input.userId)
    .maybeSingle();
  if (sub?.email_optout) {
    return { sent: false, reason: 'opted_out' };
  }

  // 2) Anti-duplicate: don't send the same type twice in 24h
  //    (defensive — also lets us re-run cron without spamming)
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from('email_log')
    .select('id')
    .eq('user_id', input.userId)
    .eq('email_type', input.type)
    .gte('sent_at', sinceIso)
    .limit(1);
  if (recent && recent.length > 0) {
    return { sent: false, reason: 'already_sent_recently' };
  }

  // 3) Send via Resend
  let messageId: string | null = null;
  try {
    const client = getResendClient();
    const res = await client.emails.send({
      from: EMAIL_FROM,
      to: input.to,
      replyTo: EMAIL_REPLY_TO,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: {
        // List-Unsubscribe header lets Gmail/Outlook show a native
        // unsubscribe button. Required for high-deliverability senders.
        'List-Unsubscribe': `<https://businesscoachai.app/api/emails/unsubscribe?u=${input.userId}&t=${getUnsubToken(input.userId)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    if (res.error) {
      return { sent: false, reason: `resend_error:${res.error.message}` };
    }
    messageId = res.data?.id ?? null;
  } catch (err) {
    return { sent: false, reason: `exception:${err instanceof Error ? err.message : String(err)}` };
  }

  // 4) Log the send (idempotency + audit). If logging fails we still
  //    return sent:true because the email did go out.
  await admin.from('email_log').insert({
    user_id: input.userId,
    email_type: input.type,
    resend_message_id: messageId,
  });

  return { sent: true, messageId };
}

// Local helper so we don't circular-import unsubscribe-token (it imports nothing else,
// safe to import directly here).
import { buildUnsubscribeToken } from './unsubscribe-token';
function getUnsubToken(userId: string): string {
  return buildUnsubscribeToken(userId);
}
