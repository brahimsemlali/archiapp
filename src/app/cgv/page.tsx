import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { LEGAL_ENTITY } from "@/lib/legal";
import { PLAN_LIMITS, formatLimit, type WorkspacePlan } from "@/lib/billing/plans";

export const metadata = {
  title: "Conditions Générales de Vente — ArchiDesk",
};

const PLAN_ORDER: WorkspacePlan[] = ["solo", "studio", "agence"];

export default function CgvPage() {
  const e = LEGAL_ENTITY;
  return (
    <LegalShell title="Conditions Générales de Vente" current="/cgv">
      <LegalSection title="1. Objet">
        <p className="text-[#475569]">
          Les présentes Conditions Générales de Vente (« CGV ») régissent la souscription aux
          abonnements payants de la plateforme {e.brand}. Elles complètent les{" "}
          <a href="/terms" className="text-primary hover:underline">Conditions Générales d&apos;Utilisation</a>{" "}
          ; en cas de souscription à un plan payant, le client déclare en avoir pris connaissance et les accepter.
        </p>
      </LegalSection>

      <LegalSection title="2. Plans et tarifs">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F7F8FA]">
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Plan</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Prix/mois</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Utilisateurs</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Projets</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ORDER.map((key) => {
                const p = PLAN_LIMITS[key];
                return (
                  <tr key={key}>
                    <td className="p-3 border border-[#E5E7EB] text-[#475569] font-medium">{p.label}</td>
                    <td className="p-3 border border-[#E5E7EB] text-[#475569]">
                      {p.monthlyPriceMad === 0 ? "Gratuit" : `${p.monthlyPriceMad} MAD HT`}
                    </td>
                    <td className="p-3 border border-[#E5E7EB] text-[#475569]">{formatLimit(p.seats)}</td>
                    <td className="p-3 border border-[#E5E7EB] text-[#475569]">{formatLimit(p.projects)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[#64748B] text-[12px] mt-2">
          Les prix sont indiqués hors taxes. La TVA de 20 % est appliquée conformément à la
          législation marocaine en vigueur. Les prix peuvent être révisés ; toute modification est
          communiquée à l&apos;avance et ne s&apos;applique qu&apos;à la période de facturation suivante.
        </p>
      </LegalSection>

      <LegalSection title="3. Période d'essai">
        <p className="text-[#475569]">
          Tout nouveau compte bénéficie d&apos;un essai gratuit de <strong>14 jours</strong>, sans carte
          bancaire, avec accès aux fonctionnalités du plan Studio AI. À l&apos;issue de cette période, le
          compte bascule automatiquement vers le plan <strong>Basic</strong> (gratuit) en l&apos;absence
          de souscription à un plan payant.
        </p>
      </LegalSection>

      <LegalSection title="4. Souscription et paiement">
        <p className="text-[#475569]">
          La souscription s&apos;effectue en ligne depuis l&apos;espace de travail. Le paiement est traité
          par notre prestataire <strong>Lemon Squeezy</strong>, agissant en qualité de revendeur officiel
          (« Merchant of Record ») ; à ce titre, la facture de l&apos;abonnement est émise par Lemon
          Squeezy. L&apos;abonnement est mensuel et facturé d&apos;avance.
        </p>
      </LegalSection>

      <LegalSection title="5. Renouvellement et résiliation">
        <p className="text-[#475569]">
          L&apos;abonnement est reconduit automatiquement à chaque échéance mensuelle. Le client peut
          résilier à tout moment depuis Paramètres → Abonnement. La résiliation prend effet à la fin de
          la période de facturation en cours : l&apos;accès aux fonctionnalités payantes est maintenu
          jusqu&apos;à cette date, après quoi le compte revient au plan Basic. Les sommes déjà réglées au
          titre de la période en cours ne sont pas remboursées au prorata.
        </p>
      </LegalSection>

      <LegalSection title="6. Défaut de paiement">
        <p className="text-[#475569]">
          En cas d&apos;échec ou de défaut de paiement, l&apos;accès aux fonctionnalités payantes peut être
          suspendu, puis le compte rétrogradé vers le plan Basic. Les données du client restent
          accessibles dans les limites du plan Basic et peuvent être exportées à tout moment depuis
          Paramètres → Données &amp; confidentialité.
        </p>
      </LegalSection>

      <LegalSection title="7. Clientèle professionnelle">
        <p className="text-[#475569]">
          {e.brand} est un service destiné aux professionnels (architectes, décorateurs, studios de
          design) dans le cadre de leur activité. La souscription est conclue à des fins professionnelles ;
          les dispositions protectrices propres aux consommateurs, y compris un éventuel droit de
          rétractation, ne s&apos;appliquent pas.
        </p>
      </LegalSection>

      <LegalSection title="8. Fonctionnalités IA">
        <p className="text-[#475569]">
          Les fonctionnalités d&apos;intelligence artificielle sont fournies « en l&apos;état » dans la
          limite du quota mensuel du plan souscrit. Les documents générés doivent être vérifiés par le
          client avant tout usage professionnel ou légal ; {e.brand} ne garantit pas leur exactitude
          juridique.
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable et litiges">
        <p className="text-[#475569]">
          Les présentes CGV sont soumises au droit marocain. À défaut de résolution amiable, tout litige
          relève de la compétence exclusive des tribunaux de Casablanca, Maroc.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p className="text-[#475569]">
          Pour toute question relative à la facturation :{" "}
          <a href={`mailto:${e.contactEmail}`} className="text-primary hover:underline">{e.contactEmail}</a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
