import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-gradient-to-br from-indigo-500/10 via-blue-600/8 to-blue-800/8 blur-3xl" />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16">
        {children}

        <hr className="my-12 border-white/10" />
        <p className="text-xs text-gray-500 text-center">
          AI Business Coach — Tous droits réservés.
        </p>
      </main>
    </div>
  );
}
