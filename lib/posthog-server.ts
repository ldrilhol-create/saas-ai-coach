import { PostHog } from 'posthog-node';

// Shared server-side PostHog client. Used to fire events from API routes,
// webhooks and cron jobs — anywhere outside the browser. Mirrors the same
// project as the client SDK so events land in one place.
//
// Initialised lazily so missing env vars don't crash the build in dev/preview
// environments where PostHog isn't configured.

let cached: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  if (cached) return cached;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  cached = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    // flushAt: send events after this many are queued (default 20)
    // flushInterval: ms between flushes (default 10s)
    // For server-side we want low latency so we flush on every event.
    flushAt: 1,
    flushInterval: 0,
  });
  return cached;
}

/**
 * Fire a server-side event and flush immediately. Safe to call from anywhere
 * — silently no-ops if PostHog isn't configured. Never throws.
 */
export async function captureServerEvent(opts: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  groups?: Record<string, string>;
}): Promise<void> {
  const client = getPostHogServer();
  if (!client) return;
  try {
    client.capture({
      distinctId: opts.distinctId,
      event: opts.event,
      properties: opts.properties,
      groups: opts.groups,
    });
    // Flush + wait so the event ships before serverless function exits.
    // Without this, lambdas would terminate before the HTTP request completes.
    await client.flush();
  } catch (err) {
    // Never block the calling flow on analytics issues.
    console.error('[posthog-server] capture failed:', err);
  }
}

/**
 * Set or update user-level properties server-side. Useful from webhook
 * (e.g., update `tier` when a subscription changes).
 */
export async function setUserProperties(
  distinctId: string,
  properties: Record<string, unknown>
): Promise<void> {
  const client = getPostHogServer();
  if (!client) return;
  try {
    client.identify({ distinctId, properties });
    await client.flush();
  } catch (err) {
    console.error('[posthog-server] identify failed:', err);
  }
}
