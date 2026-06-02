import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { LEGAL_ENTITY, appDomain } from "@/lib/legal";

export const metadata = {
  title: "Politique de Confidentialité — ArchiDesk",
};

export default function PrivacyPage() {
  const e = LEGAL_ENTITY;
  return (
    <LegalShell title="Politique de Confidentialité" current="/privacy">
      <LegalSection title="1. Responsable du traitement">
        <p className="text-[#475569]">
          {e.brand} (« nous »), éditeur de la plateforme accessible à <strong>{appDomain()}</strong>, est
          responsable du traitement des données personnelles collectées via le Service. L&apos;identité
          complète de l&apos;éditeur figure dans les{" "}
          <a href="/mentions-legales" className="text-primary hover:underline">mentions légales</a>.
        </p>
        <p className="text-[#475569] mt-2">
          Contact :{" "}
          <a href={`mailto:${e.privacyEmail}`} className="text-primary hover:underline">{e.privacyEmail}</a>
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <ul className="list-disc list-inside space-y-2 text-[#475569]">
          <li><strong>Données de compte :</strong> adresse email, nom, nom du cabinet.</li>
          <li><strong>Données professionnelles :</strong> informations fiscales (ICE, RC, IF), coordonnées bancaires (IBAN), adresse.</li>
          <li><strong>Données clients :</strong> noms, emails, téléphones des clients que vous gérez dans le Service.</li>
          <li><strong>Fichiers :</strong> plans, documents, photos et autres fichiers uploadés.</li>
          <li><strong>Données d&apos;usage :</strong> logs de connexion, actions effectuées, adresses IP.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalités du traitement">
        <ul className="list-disc list-inside space-y-2 text-[#475569]">
          <li>Fourniture et amélioration du Service.</li>
          <li>Facturation et gestion de l&apos;abonnement.</li>
          <li>Support client et communication transactionnelle.</li>
          <li>Sécurité et détection de fraudes.</li>
          <li>Conformité légale et réglementaire.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base légale">
        <p className="text-[#475569]">Le traitement est fondé sur :</p>
        <ul className="list-disc list-inside space-y-2 text-[#475569] mt-2">
          <li><strong>L&apos;exécution du contrat</strong> : pour fournir le Service souscrit.</li>
          <li><strong>L&apos;intérêt légitime</strong> : amélioration du Service, sécurité.</li>
          <li><strong>Obligation légale</strong> : conservation comptable, réponses aux autorités.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Sous-traitants">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F7F8FA]">
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Sous-traitant</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Rôle</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Pays</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Supabase Inc.</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Base de données, authentification, stockage fichiers</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">UE (AWS eu-west-3, Paris)</td>
              </tr>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Vercel Inc.</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Hébergement de l&apos;application</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">USA (CDN mondial)</td>
              </tr>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Resend Inc.</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Envoi d&apos;emails transactionnels</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">USA</td>
              </tr>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Anthropic PBC</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Génération IA (contrats, résumés)</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">USA</td>
              </tr>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Lemon Squeezy LLC</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Paiement des abonnements (Merchant of Record)</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">USA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="6. Durée de conservation">
        <p className="text-[#475569]">
          Les données sont conservées pendant toute la durée de votre abonnement, puis 3 ans après la
          résiliation pour les données de facturation (obligation légale marocaine), et supprimées sur
          demande pour les autres données.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p className="text-[#475569]">
          Conformément à la loi 09-08 relative à la protection des données personnelles au Maroc et au
          RGPD :
        </p>
        <ul className="list-disc list-inside space-y-2 text-[#475569] mt-2">
          <li>Droit d&apos;accès à vos données (export JSON disponible dans Paramètres)</li>
          <li>Droit de rectification</li>
          <li>Droit à l&apos;effacement (suppression du compte)</li>
          <li>Droit à la portabilité</li>
          <li>Droit d&apos;opposition au traitement</li>
        </ul>
        <p className="text-[#475569] mt-3">
          Pour exercer ces droits :{" "}
          <a href={`mailto:${e.privacyEmail}`} className="text-primary hover:underline">{e.privacyEmail}</a>
        </p>
      </LegalSection>

      <LegalSection title="8. Sécurité">
        <p className="text-[#475569]">
          Toutes les données sont chiffrées en transit (TLS 1.3) et au repos. L&apos;accès est contrôlé par
          Row Level Security (RLS) — aucun utilisateur ne peut accéder aux données d&apos;un autre espace de
          travail.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
