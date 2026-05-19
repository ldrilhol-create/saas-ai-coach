import { ImageResponse } from 'next/og';

// Image Open Graph générée à la volée par Next.js. Affichée quand quelqu'un
// partage businesscoachai.app sur LinkedIn, Twitter, iMessage, Slack, Facebook…
//
// Next.js convention: ce fichier sert /opengraph-image (et le metadata
// resolveur l'attache automatiquement aux Open Graph + Twitter Card).
//
// Format standard requis par les réseaux sociaux: 1200x630.
export const runtime = 'edge';
export const alt = 'AI Business Coach — Le coach IA des solopreneurs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #1e3a8a 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Glow effect en background */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0) 70%)',
          }}
        />

        {/* Header avec logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background:
                'linear-gradient(135deg, #6366f1 0%, #2563eb 50%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 800,
              boxShadow: '0 10px 40px -10px rgba(59,130,246,0.6)',
            }}
          >
            AI
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            Business Coach AI
          </div>
        </div>

        {/* Espace flex pour pousser le titre vers le centre */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 40 }}>
          {/* Titre principal */}
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-2px',
              marginBottom: 24,
              maxWidth: 1000,
            }}
          >
            Lance ton business
            <br />
            avec un coach IA qui te suit
            <br />
            <span
              style={{
                background:
                  'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              pas à pas.
            </span>
          </div>

          {/* Sous-titre */}
          <div
            style={{
              fontSize: 28,
              color: '#94a3b8',
              fontWeight: 500,
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            Roadmap perso en 90 sec · Coach 24/7 · À partir de 1€/jour
          </div>
        </div>

        {/* Footer avec URL + essai gratuit */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 40,
            fontSize: 24,
          }}
        >
          <div style={{ color: '#cbd5e1', fontWeight: 500 }}>
            businesscoachai.app
          </div>
          <div
            style={{
              padding: '14px 28px',
              borderRadius: 9999,
              background: '#10b981',
              color: 'white',
              fontWeight: 700,
              fontSize: 22,
            }}
          >
            🎁 Essai gratuit 7 jours
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
