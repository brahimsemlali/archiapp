import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Conditions Générales d'Utilisation — ArchiDesk",
};

export default function TermsPage() {
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
            <strong>Document en cours de révision légale.</strong> Ce texte est un brouillon provisoire et n'a pas encore été validé par un juriste. Il ne constitue pas un avis juridique.
          </p>
        </div>

        <h1 className="font-fraunces text-[32px] font-semibold text-[#16170E] mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-[13px] text-[#82806F] mb-10">Dernière mise à jour : mai 2026 (brouillon)</p>

        <div className="space-y-8 text-[14px] leading-relaxed">
          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">1. Objet</h2>
            <p className="text-[#475569]">Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme ArchiDesk (ci-après « le Service »), accessible à l'adresse <strong>archidesk.ma</strong>, éditée par ArchiDesk.</p>
            <p className="text-[#475569] mt-2">En vous inscrivant, vous acceptez les présentes CGU dans leur intégralité.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">2. Description du Service</h2>
            <p className="text-[#475569]">ArchiDesk est une plateforme SaaS (Software as a Service) destinée aux architectes, décorateurs et studios de design. Elle propose des fonctionnalités de gestion de projets, de clients, de devis, de factures, de contrats, de visites de chantier et d'intelligence artificielle.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">3. Accès au Service</h2>
            <p className="text-[#475569]">L'accès au Service requiert la création d'un compte et le paiement d'un abonnement (après la période d'essai gratuit de 14 jours). L'utilisateur est responsable de la confidentialité de ses identifiants.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">4. Plans et tarification</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F4]">
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Plan</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Prix/mois</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Utilisateurs</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Projets</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569] font-medium">Basic</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Gratuit</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">1</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">10</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569] font-medium">Studio AI</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">399 MAD</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">3</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Illimité</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569] font-medium">Agence AI</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">799 MAD</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">10</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Illimité</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#82806F] text-[12px] mt-2">Les prix sont HT. TVA 20% applicable selon la législation marocaine en vigueur.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">5. Période d'essai</h2>
            <p className="text-[#475569]">Tout nouveau compte bénéficie d'un essai gratuit de <strong>14 jours</strong> avec accès à toutes les fonctionnalités Studio AI. À l'issue de cette période, le compte bascule automatiquement vers le plan Basic sauf souscription à un plan payant.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">6. Fonctionnalités IA</h2>
            <p className="text-[#475569]">Les fonctionnalités IA (génération de contrats, résumés de visites, etc.) sont fournies « en l'état ». Les documents générés doivent être vérifiés par l'utilisateur avant tout usage professionnel ou légal. ArchiDesk ne garantit pas leur exactitude juridique et décline toute responsabilité en cas d'erreur. Un avertissement « Ce document est généré par IA » est systématiquement affiché.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">7. Propriété des données</h2>
            <p className="text-[#475569]">L'utilisateur conserve l'entière propriété de ses données. ArchiDesk n'utilise pas les données des utilisateurs pour entraîner des modèles d'IA ou à des fins commerciales tierces. L'utilisateur peut exporter ses données à tout moment via Paramètres → Données & confidentialité.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">8. Suspension et résiliation</h2>
            <p className="text-[#475569]">ArchiDesk se réserve le droit de suspendre ou de résilier un compte en cas de violation des présentes CGU, d'impayés, ou d'usage abusif du Service. L'utilisateur peut résilier son abonnement à tout moment depuis les Paramètres.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">9. Limitation de responsabilité</h2>
            <p className="text-[#475569]">ArchiDesk ne saurait être tenu responsable des dommages indirects, pertes de données, pertes de revenus, ou préjudices commerciaux résultant de l'utilisation ou de l'impossibilité d'utiliser le Service. La responsabilité totale d'ArchiDesk est limitée aux sommes effectivement payées par l'utilisateur au cours des 12 derniers mois.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">10. Droit applicable</h2>
            <p className="text-[#475569]">Les présentes CGU sont soumises au droit marocain. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de Casablanca, Maroc.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">11. Contact</h2>
            <p className="text-[#475569]">Pour toute question : <a href="mailto:support@archidesk.ma" className="text-primary hover:underline">support@archidesk.ma</a></p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-[13px] text-[#82806F]">
          <Link href="/privacy" className="hover:underline">Confidentialité</Link>
          <Link href="/cookies" className="hover:underline">Cookies</Link>
        </div>
      </main>
    </div>
  );
}
