'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher, useLang } from '@/lib/i18n';

export default function MentionsLegalesPage() {
  const router = useRouter();
  const { t } = useLang();

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-10">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t.pricing.legalBackHome}
        </button>
        <LanguageSwitcher />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-3">Mentions légales / Impressum</h1>
      <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : 12 mai 2026 · Service exploité depuis la Suisse</p>

      <div className="space-y-8 text-gray-200 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-3 text-white">1. Éditeur du service</h2>
          <p>
            Le service <strong>AI Business Coach</strong>, accessible à l&apos;adresse{' '}
            <a href="https://saas-ai-coach.vercel.app" className="text-indigo-300 underline">
              https://saas-ai-coach.vercel.app
            </a>
            , est édité par&nbsp;:
          </p>
          <p className="mt-3">
            • <strong>Nom</strong> : Léo Drilhol
            <br />
            • <strong>Forme juridique</strong> : personne physique exerçant en activité
            indépendante non inscrite au Registre du Commerce (chiffre d&apos;affaires inférieur au
            seuil légal d&apos;inscription de CHF 100 000)
            <br />
            • <strong>Adresse</strong> : Route de Provence 20, canton de Vaud, Suisse
            <br />
            • <strong>E-mail de contact</strong> :{' '}
            <a href="mailto:buisnesscoachia@gmail.com" className="text-indigo-300 underline">
              buisnesscoachia@gmail.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">2. Responsable du contenu</h2>
          <p>
            <strong>Léo Drilhol</strong>, en qualité de propriétaire et exploitant du service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">3. Hébergement technique</h2>
          <p>L&apos;infrastructure technique du service est assurée par&nbsp;:</p>
          <p className="mt-2">
            <strong>Vercel Inc.</strong>
            <br />
            340 S Lemon Ave #4133
            <br />
            Walnut, CA 91789, États-Unis
            <br />
            Site web :{' '}
            <a href="https://vercel.com" className="text-indigo-300 underline">
              vercel.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">4. Sous-traitants techniques</h2>
          <p>
            AI Business Coach s&apos;appuie sur les fournisseurs suivants pour rendre le service&nbsp;:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Supabase Pte. Ltd.</strong> — base de données et authentification, serveurs
              dans l&apos;Union européenne (Irlande).
            </li>
            <li>
              <strong>Anthropic, PBC</strong> — modèles d&apos;intelligence artificielle Claude,
              serveurs aux États-Unis (transfert encadré par le Swiss-U.S. Data Privacy Framework
              et/ou des clauses contractuelles standard).
            </li>
            <li>
              <strong>Vercel Inc.</strong> — hébergement de l&apos;application, États-Unis / Europe.
            </li>
          </ul>
          <p className="mt-3 text-sm text-gray-400">
            Pour le détail des traitements effectués sur vos données personnelles, voir la{' '}
            <Link href="/legal/confidentialite" className="text-indigo-300 underline">
              Politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">5. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments du service (textes, graphismes, logo, interface, code
            source, base de données) sont la propriété exclusive de Léo Drilhol, sauf mentions
            contraires. Toute reproduction,
            représentation ou exploitation, totale ou partielle, sans autorisation écrite préalable
            est interdite et constituerait une infraction sanctionnée par la Loi fédérale sur le
            droit d&apos;auteur et les droits voisins (LDA, RS 231.1).
          </p>
          <p className="mt-3">
            Les marques <strong>Claude</strong> et le logo associé sont la propriété
            d&apos;Anthropic, PBC.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">6. Contact</h2>
          <p>
            Pour toute question relative à ces mentions légales ou au service, vous pouvez nous
            écrire à&nbsp;:{' '}
            <a href="mailto:buisnesscoachia@gmail.com" className="text-indigo-300 underline">
              buisnesscoachia@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">7. Droit applicable et for</h2>
          <p>
            Les présentes mentions légales sont soumises au droit suisse. Pour tout litige relatif
            à ces mentions, les tribunaux du canton de Vaud sont seuls compétents, sous réserve des
            dispositions impératives de protection des consommateurs.
          </p>
        </section>

        <section className="border-t border-white/10 pt-6 mt-10">
          <p className="text-xs text-gray-500 leading-relaxed">
            Ces mentions sont fournies à titre indicatif et constituent un point de départ adapté
            au droit suisse. Il est fortement recommandé de les faire valider par un professionnel
            du droit (avocat, fiduciaire) avant la mise en ligne publique du service avec
            facturation réelle.
          </p>
        </section>
      </div>
    </>
  );
}
