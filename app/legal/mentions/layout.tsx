import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description:
    'Mentions légales de AI Business Coach. Éditeur, hébergeur, contact, propriété intellectuelle et juridiction applicable.',
  alternates: { canonical: '/legal/mentions' },
  openGraph: {
    title: 'Mentions légales · AI Business Coach',
    description: 'Éditeur, hébergeur, contact, propriété intellectuelle.',
  },
};

export default function MentionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
