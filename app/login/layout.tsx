import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connecte-toi à ton compte AI Business Coach ou crée-en un nouveau. Reprends ta roadmap et ton chat coach IA en un clic.',
  openGraph: {
    title: 'Connexion · AI Business Coach',
    description: 'Reprends ta roadmap et ton chat coach IA en un clic.',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
