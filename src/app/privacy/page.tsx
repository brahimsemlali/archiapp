import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Politique de Confidentialité — ArchiDesk",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F4]">
      <header className="bg-white border-b border-[#E8E6DF] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-fraunces text-[18px] font-semibold text-[#16170E]">ArchiDesk</Link>
          <Link href="/dashboard" className="text-[13px] text-[#82806F] hover:underline">← Retour</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 mb-8">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500 mt-0.5" />
          <p className="text-[13px] text-orange-800 font-medium">
            <strong>Document en cours de révision légale.</strong> Ce texte est un brouillon provisoire et n'a pas encore été validé par un juriste.
          </p>
        </div>

        <h1 className="font-fraunces text-[32px] font-semibold text-[#16170E] mb-2">Politique de Confidentialité</h1>
        <p className="text-[13px] text-[#82806F] mb-10">Dernière mise à jour : mai 2026 (brouillon)</p>

        <div className="space-y-8 text-[14px] leading-relaxed">
          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">1. Responsable du traitement</h2>
            <p className="text-[#475569]">ArchiDesk (ci-après « nous »), éditeur de la plateforme accessible à <strong>archidesk.ma</strong>, est responsable du traitement des données personnelles collectées via le Service.</p>
            <p className="text-[#475569] mt-2">Contact : <a href="mailto:privacy@archidesk.ma" className="text-primary hover:underline">privacy@archidesk.ma</a></p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">2. Données collectées</h2>
            <ul className="list-disc list-inside space-y-2 text-[#475569]">
              <li><strong>Données de compte :</strong> adresse email, nom, nom du cabinet.</li>
              <li><strong>Données professionnelles :</strong> informations fiscales (ICE, RC, IF), coordonnées bancaires (IBAN), adresse.</li>
              <li><strong>Données clients :</strong> noms, emails, téléphones des clients que vous gérez dans le Service.</li>
              <li><strong>Fichiers :</strong> plans, documents, photos et autres fichiers uploadés.</li>
              <li><strong>Données d'usage :</strong> logs de connexion, actions effectuées, adresses IP.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">3. Finalités du traitement</h2>
            <ul className="list-disc list-inside space-y-2 text-[#475569]">
              <li>Fourniture et amélioration du Service.</li>
              <li>Facturation et gestion de l'abonnement.</li>
              <li>Support client et communication transactionnelle.</li>
              <li>Sécurité et détection de fraudes.</li>
              <li>Conformité légale et réglementaire.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">4. Base légale</h2>
            <p className="text-[#475569]">Le traitement est fondé sur :</p>
            <ul className="list-disc list-inside space-y-2 text-[#475569] mt-2">
              <li><strong>L'exécution du contrat</strong> : pour fournir le Service souscrit.</li>
              <li><strong>L'intérêt légitime</strong> : amélioration du Service, sécurité.</li>
              <li><strong>Obligation légale</strong> : conservation comptable, réponses aux autorités.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">5. Sous-traitants</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F4]">
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Sous-traitant</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Rôle</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Pays</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Supabase Inc.</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Base de données, authentification, stockage fichiers</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">USA (UE via AWS eu-west-3)</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Vercel Inc.</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Hébergement de l'application</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">USA (CDN mondial)</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Resend Inc.</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Envoi d'emails transactionnels</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">USA</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Anthropic PBC</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Génération IA (contrats, résumés)</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">USA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">6. Durée de conservation</h2>
            <p className="text-[#475569]">Les données sont conservées pendant toute la durée de votre abonnement, puis 3 ans après la résiliation pour les données de facturation (obligation légale marocaine), et supprimées sur demande pour les autres données.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">7. Vos droits</h2>
            <p className="text-[#475569]">Conformément à la loi 09-08 relative à la protection des données personnelles au Maroc et au RGPD :</p>
            <ul className="list-disc list-inside space-y-2 text-[#475569] mt-2">
              <li>Droit d'accès à vos données (export JSON disponible dans Paramètres)</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement (suppression du compte)</li>
              <li>Droit à la portabilité</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
            <p className="text-[#475569] mt-3">Pour exercer ces droits : <a href="mailto:privacy@archidesk.ma" className="text-primary hover:underline">privacy@archidesk.ma</a></p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">8. Sécurité</h2>
            <p className="text-[#475569]">Toutes les données sont chiffrées en transit (TLS 1.3) et au repos. L'accès est contrôlé par Row Level Security (RLS) — aucun utilisateur ne peut accéder aux données d'un autre espace de travail.</p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-[13px] text-[#82806F]">
          <Link href="/terms" className="hover:underline">CGU</Link>
          <Link href="/cookies" className="hover:underline">Cookies</Link>
        </div>
      </main>
    </div>
  );
}
