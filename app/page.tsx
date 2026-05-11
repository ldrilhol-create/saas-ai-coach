'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold">AI Business Coach</h1>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <h2 className="text-5xl font-bold mb-6">Build Your Business With AI</h2>
          <p className="text-xl text-gray-400 mb-8">
            Get a personalized roadmap from idea to first $10k
          </p>
          <button
            onClick={() => router.push('/quiz')}
            className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 mb-12"
          >
            Start Free
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500">
        <p>© 2024 AI Business Coach</p>
      </footer>
    </div>
  );
}