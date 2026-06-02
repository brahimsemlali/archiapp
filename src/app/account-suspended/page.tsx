import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AccountSuspendedPage() {
  return (
    <main className="min-h-dvh bg-[#F7F8FA] px-4 py-10 text-[#0B1220]">
      <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEFE6] text-[#C75B2E]">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="eyebrow mb-2">Compte suspendu</p>
        <h1 className="font-fraunces text-4xl font-semibold tracking-normal">Accès temporairement désactivé</h1>
        <p className="mt-4 text-sm leading-7 text-[#475569]">
          Votre espace de travail est suspendu ou annulé. Contactez le support pour réactiver
          l'accès, mettre à jour le paiement ou vérifier votre abonnement.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href="mailto:support@archidesk.app"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0B1220] px-4 text-sm font-semibold text-white"
          >
            Contacter le support
          </a>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#1E293B]"
          >
            Retour connexion
          </Link>
        </div>
      </div>
    </main>
  );
}
