import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { LEGAL_ENTITY, appDomain } from "@/lib/legal";

export const metadata = {
  title: "Conditions Générales d'Utilisation — ArchiDesk",
};

export default function TermsPage() {
  const e = LEGAL_ENTITY;
  return (
    <LegalShell title="Conditions Générales d'Utilisation" current="/terms">
      <LegalSection title="1. Objet">
        <p className="text-[#475569]">
          Les présentes Conditions Générales d&apos;Utilisation (« CGU ») régissent l&apos;accès et
          l&apos;utilisation de la plateforme {e.brand} (« le Service »), accessible à l&apos;adresse{" "}
          <strong>{appDomain()}</strong>. L&apos;identité de l&apos;éditeur figure dans les{" "}
          <a href="/mentions-legales" className="text-primary hover:underline">mentions légales</a>.
        </p>
        <p className="text-[#475569] mt-2">
          En vous inscrivant, vous acceptez les présentes CGU dans leur intégralité.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du Service">
        <p className="text-[#475569]">
          {e.brand} est une plateforme SaaS destinée aux architectes, décorateurs et studios de design.
          Elle propose des fonctionnalités de gestion de projets, de clients, de devis, de factures, de
          contrats, de visites de chantier et d&apos;intelligence artificielle.
        </p>
      </LegalSection>

      <LegalSection title="3. Accès au Service">
        <p className="text-[#475569]">
          L&apos;accès au Service requiert la création d&apos;un compte. Après la période d&apos;essai
          gratuit de 14 jours, l&apos;accès aux fonctionnalités payantes nécessite la souscription d&apos;un
          abonnement. L&apos;utilisateur est responsable de la confidentialité de ses identifiants.
        </p>
      </LegalSection>

      <LegalSection title="4. Plans et tarification">
        <p className="text-[#475569]">
          Le Service est proposé en plusieurs plans (gratuit et payants). Les tarifs détaillés, les
          modalités de paiement, de renouvellement et de résiliation figurent dans nos{" "}
          <a href="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</a>.
        </p>
      </LegalSection>

      <LegalSection title="5. Période d'essai">
        <p className="text-[#475569]">
          Tout nouveau compte bénéficie d&apos;un essai gratuit de <strong>14 jours</strong> avec accès aux
          fonctionnalités du plan Studio AI. À l&apos;issue de cette période, le compte bascule
          automatiquement vers le plan Basic sauf souscription à un plan payant.
        </p>
      </LegalSection>

      <LegalSection title="6. Fonctionnalités IA">
        <p className="text-[#475569]">
          Les fonctionnalités IA (génération de contrats, résumés de visites, etc.) sont fournies « en
          l&apos;état ». Les documents générés doivent être vérifiés par l&apos;utilisateur avant tout
          usage professionnel ou légal. {e.brand} ne garantit pas leur exactitude juridique et décline
          toute responsabilité en cas d&apos;erreur. Un avertissement « Ce document est généré par IA » est
          systématiquement affiché.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriété des données">
        <p className="text-[#475569]">
          L&apos;utilisateur conserve l&apos;entière propriété de ses données. {e.brand} n&apos;utilise pas
          les données des utilisateurs pour entraîner des modèles d&apos;IA ou à des fins commerciales
          tierces. L&apos;utilisateur peut exporter ses données à tout moment via Paramètres → Données
          &amp; confidentialité.
        </p>
      </LegalSection>

      <LegalSection title="8. Suspension et résiliation">
        <p className="text-[#475569]">
          {e.brand} se réserve le droit de suspendre ou de résilier un compte en cas de violation des
          présentes CGU, d&apos;impayés, ou d&apos;usage abusif du Service. L&apos;utilisateur peut résilier
          son abonnement à tout moment depuis les Paramètres.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitation de responsabilité">
        <p className="text-[#475569]">
          {e.brand} ne saurait être tenu responsable des dommages indirects, pertes de données, pertes de
          revenus, ou préjudices commerciaux résultant de l&apos;utilisation ou de l&apos;impossibilité
          d&apos;utiliser le Service. La responsabilité totale de {e.brand} est limitée aux sommes
          effectivement payées par l&apos;utilisateur au cours des 12 derniers mois.
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable">
        <p className="text-[#475569]">
          Les présentes CGU sont soumises au droit marocain. Tout litige relatif à leur interprétation ou
          exécution sera soumis aux tribunaux compétents de Casablanca, Maroc.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p className="text-[#475569]">
          Pour toute question :{" "}
          <a href={`mailto:${e.contactEmail}`} className="text-primary hover:underline">{e.contactEmail}</a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
