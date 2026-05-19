import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Politique de Cookies — ArchiDesk",
};

export default function CookiesPage() {
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

        <h1 className="font-fraunces text-[32px] font-semibold text-[#16170E] mb-2">Politique de Cookies</h1>
        <p className="text-[13px] text-[#82806F] mb-10">Dernière mise à jour : mai 2026 (brouillon)</p>

        <div className="space-y-8 text-[14px] leading-relaxed">
          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-[#475569]">Un cookie est un petit fichier texte déposé sur votre appareil lorsque vous visitez un site web. Il permet de mémoriser certaines informations pour améliorer votre expérience.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">2. Cookies utilisés par ArchiDesk</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F4]">
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Nom</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Finalité</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Durée</th>
                    <th className="text-left p-3 border border-[#E8E6DF] font-semibold text-[#16170E]">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569] font-mono">sb-*</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Session d'authentification Supabase</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Session / 7 jours</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Essentiel</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569] font-mono">locale</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Langue de l'interface (fr / ar)</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">1 an</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Fonctionnel</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569] font-mono">active-workspace</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Espace de travail actif (multi-workspace)</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">30 jours</td>
                    <td className="p-3 border border-[#E8E6DF] text-[#475569]">Fonctionnel</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#82806F] text-[12px] mt-3">ArchiDesk n'utilise <strong>aucun cookie publicitaire ou de tracking tiers</strong>. Nous n'utilisons pas Google Analytics, Facebook Pixel ni aucun outil de profilage commercial.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">3. Cookies essentiels</h2>
            <p className="text-[#475569]">Les cookies d'authentification sont strictement nécessaires au fonctionnement du Service. Sans eux, vous ne pouvez pas vous connecter. Ils ne nécessitent pas votre consentement préalable (Article 5 de la Directive ePrivacy).</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">4. Gestion des cookies</h2>
            <p className="text-[#475569]">Vous pouvez gérer vos préférences de cookies depuis les paramètres de votre navigateur. La suppression des cookies essentiels entraînera votre déconnexion du Service.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[#16170E] mb-3">5. Contact</h2>
            <p className="text-[#475569]">Pour toute question : <a href="mailto:privacy@archidesk.ma" className="text-primary hover:underline">privacy@archidesk.ma</a></p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-[13px] text-[#82806F]">
          <Link href="/terms" className="hover:underline">CGU</Link>
          <Link href="/privacy" className="hover:underline">Confidentialité</Link>
        </div>
      </main>
    </div>
  );
}
