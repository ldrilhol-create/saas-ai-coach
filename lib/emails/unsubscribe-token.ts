import { createHmac, timingSafeEqual } from 'node:crypto';

// HMAC-signed unsubscribe token. Stateless (no DB lookup needed to verify).
// The link looks like: /api/emails/unsubscribe?u=<user_id>&t=<signature>
//
// We derive the secret from SUPABASE_SERVICE_ROLE_KEY (always present on the
// server) so we don't need a new env var. The token doesn't expire — that's
// fine because unsubscribe is an idempotent positive action.

function getSecret(): string {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing — required to sign unsubscribe tokens');
  return raw;
}

export function buildUnsubscribeToken(userId: string): string {
  return createHmac('sha256', getSecret()).update(userId).digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = buildUnsubscribeToken(userId);
  // Lengths differ → not equal. Avoids timingSafeEqual throwing on length mismatch.
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(userId: string, origin = 'https://businesscoachai.app'): string {
  const token = buildUnsubscribeToken(userId);
  const url = new URL('/api/emails/unsubscribe', origin);
  url.searchParams.set('u', userId);
  url.searchParams.set('t', token);
  return url.toString();
}
