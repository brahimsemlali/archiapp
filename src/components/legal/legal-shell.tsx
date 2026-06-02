import Link from "next/link";
import { Info } from "lucide-react";
import {
  LEGAL_ENTITY,
  LEGAL_LAST_UPDATED,
  LEGAL_LINKS,
  isLegalEntityConfigured,
} from "@/lib/legal";

// Shared chrome for all legal pages (Mentions légales, CGU, CGV, Confidentialité,
// Cookies). Server component — reads completeness state directly from legal.ts.

export function LegalShell({
  title,
  current,
  children,
}: {
  title: string;
  /** Path of the current page, omitted from the footer cross-nav. */
  current: string;
  children: React.ReactNode;
}) {
  const configured = isLegalEntityConfigured();
  const otherLinks = LEGAL_LINKS.filter((l) => l.href !== current);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-fraunces text-[18px] font-semibold text-[#0B1220]">
            {LEGAL_ENTITY.brand}
          </Link>
          <Link href="/dashboard" className="text-[13px] text-[#64748B] hover:underline">
            ← Retour
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {!configured && (
          <div className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 mb-8">
            <Info className="h-5 w-5 shrink-0 text-[#64748B] mt-0.5" />
            <p className="text-[13px] text-[#64748B]">
              Certaines informations de l&apos;éditeur seront complétées prochainement.
            </p>
          </div>
        )}

        <h1 className="font-fraunces text-[32px] font-semibold text-[#0B1220] mb-2">{title}</h1>
        <p className="text-[13px] text-[#64748B] mb-10">
          Dernière mise à jour : {LEGAL_LAST_UPDATED}
        </p>

        <div className="space-y-8 text-[14px] leading-relaxed">{children}</div>

        <nav className="mt-12 flex flex-wrap gap-4 text-[13px] text-[#64748B]">
          {otherLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

/** A titled section block inside a legal page. */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold text-[#0B1220] mb-3">{title}</h2>
      {children}
    </section>
  );
}
