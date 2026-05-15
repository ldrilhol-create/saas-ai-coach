'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// PostHog is initialised once on mount. The init is wrapped in a feature
// flag (env var) so dev/preview/test envs without a key don't error.
function PostHogInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
      // Auto-capture every click / change / submit on every element. The
      // killer feature — saves us from instrumenting each button by hand.
      autocapture: true,
      // Session recordings: video-like playback of real user sessions.
      // Inputs are masked by default; we add a stricter mask just in case.
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-private]',
      },
      // We capture pageviews manually below to track App Router route changes.
      capture_pageview: false,
      capture_pageleave: true,
      // Don't create a person profile for anonymous users (cheaper + cleaner).
      person_profiles: 'identified_only',
      // Loaded callback for debug — comment in to verify in dev.
      // loaded: (ph) => { if (process.env.NODE_ENV === 'development') ph.debug(); },
    });
  }, []);
  return null;
}

// App Router doesn't fire route-change events on the window, so we listen
// to pathname + searchParams and emit '$pageview' ourselves.
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthog.__loaded) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url = `${url}?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
