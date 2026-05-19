import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de confidentialité de AI Business Coach. Quelles données personnelles sont collectées, comment elles sont utilisées, et tes droits (RGPD + nLPD).',
  alternates: { canonical: '/legal/confidentialite' },
  openGraph: {
    title: 'Politique de confidentialité · AI Business Coach',
    description: 'Données collectées, utilisations, et tes droits (RGPD/nLPD).',
  },
};

export default function ConfidentialiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
