import { Resend } from 'resend';

// Single shared Resend client. Initialised lazily so the API key is only
// required when an email is actually about to be sent (build won't fail in
// envs without RESEND_API_KEY).
let cached: Resend | null = null;

export function getResendClient(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  cached = new Resend(key);
  return cached;
}

// Standard FROM address. Must use the verified Resend domain.
// Format "Display name <email>" so Gmail/Outlook show the brand.
export const EMAIL_FROM = 'Business Coach AI <noreply@businesscoachai.app>';

// Reply-to should be a real address the user can write to.
export const EMAIL_REPLY_TO = 'buisnesscoachia@gmail.com';
