import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation et de Vente (CGU/CGV)",
  description:
    "Conditions générales d'utilisation et de vente du service AI Business Coach. Édité par Léo Drilhol, exploité depuis la Suisse, droit suisse applicable.",
  alternates: { canonical: '/legal/cgu' },
  openGraph: {
    title: 'CGU/CGV · AI Business Coach',
    description: 'Conditions d\'utilisation et de vente — droit suisse.',
  },
};

export default function CguLayout({ children }: { children: React.ReactNode }) {
  return children;
}
