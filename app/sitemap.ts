import type { MetadataRoute } from 'next';

// Sitemap automatique servi à /sitemap.xml. Next.js le génère depuis ce
// fichier au build time, donc pas besoin de le maintenir à la main.
//
// On liste uniquement les routes PUBLIQUES (pas /account, /api, /roadmap qui
// sont derrière une authentification — pas d'intérêt pour le SEO).
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://businesscoachai.app';
  const now = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/legal/cgu`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/mentions`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/confidentialite`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
