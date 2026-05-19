import type { MetadataRoute } from 'next';

// robots.txt généré automatiquement par Next.js (servi à /robots.txt).
//
// On autorise les crawlers sur les pages marketing/légales et on bloque tout
// ce qui est privé (espace user, API, ingest analytics, emails de
// désabonnement, cron…). Le sitemap est pointé pour aider Google à
// découvrir les pages publiques.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/roadmap',
          '/quiz',
          '/upgrade',
          '/reset-password',
          '/api/',
          '/ingest/',
        ],
      },
    ],
    sitemap: 'https://businesscoachai.app/sitemap.xml',
    host: 'https://businesscoachai.app',
  };
}
