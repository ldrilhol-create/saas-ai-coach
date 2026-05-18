import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog reverse proxy — route /ingest/* through our own domain so
  // ad blockers (Brave, uBlock, Safari content blockers, AdGuard...) don't
  // strip out the analytics requests. Without this, ~30-50% of visitors
  // are invisible to PostHog. With it, ~100%.
  //
  // Used by app/components/PostHogProvider.tsx which sets api_host: '/ingest'.
  // Mirrors PostHog's official Next.js proxy guide.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },

  // Required so PostHog's /decide endpoint sees the right host header
  // (it returns feature-flag URLs based on the request host).
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
