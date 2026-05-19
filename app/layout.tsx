import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { PostHogProvider } from "@/app/components/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://businesscoachai.app"),
  // Default for the home; sub-routes override via their own layout.tsx
  title: {
    default: "AI Business Coach — Coach IA pour solopreneurs",
    template: "%s · AI Business Coach",
  },
  description:
    "Lance ton business avec un coach IA qui te suit pas à pas. Roadmap personnalisée en 90 secondes, chat coach 24/7, 1€/jour. Essai gratuit 7 jours.",
  keywords: [
    "coach business IA",
    "coach business en ligne",
    "roadmap business",
    "lancer son business",
    "coach solopreneur",
    "coach entrepreneur",
    "side hustle",
    "SaaS coaching",
    "AI business coach",
    "Business Coach AI",
  ],
  authors: [{ name: "Léo Drilhol" }],
  creator: "Léo Drilhol",
  publisher: "Business Coach AI",
  // FR par défaut + déclare la version EN pour Google
  alternates: {
    canonical: "/",
    languages: {
      fr: "/",
      en: "/",
      "x-default": "/",
    },
  },
  // Open Graph: ce que Facebook, LinkedIn, iMessage, Slack, etc. affichent
  // quand quelqu'un partage businesscoachai.app
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["en_US"],
    url: "https://businesscoachai.app",
    siteName: "AI Business Coach",
    title: "AI Business Coach — Le coach IA des solopreneurs",
    description:
      "Roadmap business perso en 90 secondes + coach IA disponible 24/7. À partir de 1€/jour. Essai gratuit 7 jours, sans CB.",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "AI Business Coach",
      },
    ],
  },
  // Twitter Card: affiché sur X / Twitter
  twitter: {
    card: "summary_large_image",
    title: "AI Business Coach — Le coach IA des solopreneurs",
    description:
      "Roadmap business perso en 90 sec + coach IA 24/7. À partir de 1€/jour. Essai 7j gratuit.",
    images: ["/android-chrome-512x512.png"],
  },
  // Crawlers: autoriser tout, follow + index
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // PWA + theme
  manifest: "/site.webmanifest",
  themeColor: "#0a0118",
  // Vérification Google Search Console — à remplir par l'user après création
  // verification: { google: "TON_TOKEN_GOOGLE_SEARCH_CONSOLE" },
};

// JSON-LD structured data: décrit à Google que c'est un produit SaaS.
// Permet d'apparaître en rich snippet (étoiles, prix, etc.) dans les SERP.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AI Business Coach",
  description:
    "Coach business IA pour solopreneurs. Génère une roadmap personnalisée en 90 secondes et accompagne au quotidien via chat IA.",
  url: "https://businesscoachai.app",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "29",
      priceCurrency: "EUR",
      description: "60 messages/mois, 3 roadmaps/mois, coach IA Sonnet 4.6",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "49",
      priceCurrency: "EUR",
      description: "300 messages/mois, 10 roadmaps/mois, coach IA Opus 4.7, export PDF",
    },
    {
      "@type": "Offer",
      name: "Premium",
      price: "69",
      priceCurrency: "EUR",
      description: "600 messages/mois, 20 roadmaps/mois, coach IA Opus 4.7, notes durables",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "12",
    bestRating: "5",
  },
  author: {
    "@type": "Person",
    name: "Léo Drilhol",
  },
  inLanguage: ["fr", "en"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* JSON-LD: décrit à Google que la page est un produit SaaS.
            Permet rich snippets (étoiles, prix) dans les SERP.
            Injection via script + dangerouslySetInnerHTML (Next.js
            convention recommandée pour les structured data inline). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PostHogProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
