import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { LEGAL_ENTITY } from "@/lib/legal";

export const metadata = {
  title: "Politique de Cookies — ArchiDesk",
};

export default function CookiesPage() {
  const e = LEGAL_ENTITY;
  return (
    <LegalShell title="Politique de Cookies" current="/cookies">
      <LegalSection title="1. Qu'est-ce qu'un cookie ?">
        <p className="text-[#475569]">
          Un cookie est un petit fichier texte déposé sur votre appareil lorsque vous visitez un site
          web. Il permet de mémoriser certaines informations pour améliorer votre expérience.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies utilisés par ArchiDesk">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F7F8FA]">
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Nom</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Finalité</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Durée</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569] font-mono">sb-*</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Session d&apos;authentification Supabase</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Session / 7 jours</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Essentiel</td>
              </tr>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569] font-mono">locale</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Langue de l&apos;interface (fr / en / ar)</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">1 an</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Fonctionnel</td>
              </tr>
              <tr>
                <td className="p-3 border border-[#E5E7EB] text-[#475569] font-mono">active-workspace</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Espace de travail actif (multi-workspace)</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">30 jours</td>
                <td className="p-3 border border-[#E5E7EB] text-[#475569]">Fonctionnel</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[#64748B] text-[12px] mt-3">
          {e.brand} n&apos;utilise <strong>aucun cookie publicitaire ou de tracking tiers</strong>. Nous
          n&apos;utilisons pas Google Analytics, Facebook Pixel ni aucun outil de profilage commercial.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookies essentiels">
        <p className="text-[#475569]">
          Les cookies d&apos;authentification sont strictement nécessaires au fonctionnement du Service.
          Sans eux, vous ne pouvez pas vous connecter. Ils ne nécessitent pas votre consentement préalable
          (Article 5 de la Directive ePrivacy).
        </p>
      </LegalSection>

      <LegalSection title="4. Gestion des cookies">
        <p className="text-[#475569]">
          Vous pouvez gérer vos préférences de cookies depuis les paramètres de votre navigateur. La
          suppression des cookies essentiels entraînera votre déconnexion du Service.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <p className="text-[#475569]">
          Pour toute question :{" "}
          <a href={`mailto:${e.privacyEmail}`} className="text-primary hover:underline">{e.privacyEmail}</a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
