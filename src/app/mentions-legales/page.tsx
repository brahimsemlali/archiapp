import { LegalShell, LegalSection } from "@/components/legal/legal-shell";
import { LEGAL_ENTITY, LEGAL_HOSTS, appDomain, legalValue } from "@/lib/legal";

export const metadata = {
  title: "Mentions légales — ArchiDesk",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2 py-1.5 border-b border-[#F1F5F9] last:border-0">
      <dt className="text-[#64748B] sm:w-56 shrink-0">{label}</dt>
      <dd className="text-[#0B1220] font-medium">{value}</dd>
    </div>
  );
}

export default function MentionsLegalesPage() {
  const e = LEGAL_ENTITY;
  return (
    <LegalShell title="Mentions légales" current="/mentions-legales">
      <LegalSection title="1. Éditeur du site">
        <p className="text-[#475569] mb-4">
          Le site et le service {e.brand}, accessibles à l&apos;adresse{" "}
          <strong>{appDomain()}</strong>, sont édités par :
        </p>
        <dl className="text-[14px]">
          <Row label="Raison sociale" value={legalValue(e.legalName)} />
          <Row label="Forme juridique" value={legalValue(e.legalForm)} />
          <Row label="Capital social" value={legalValue(e.capital)} />
          <Row label="Siège social" value={legalValue(e.address)} />
          <Row label="Registre de Commerce (RC)" value={legalValue(e.rc)} />
          <Row label="ICE" value={legalValue(e.ice)} />
          <Row label="Identifiant Fiscal (IF)" value={legalValue(e.ifNumber)} />
          <Row label="Directeur de la publication" value={legalValue(e.publicationDirector)} />
        </dl>
      </LegalSection>

      <LegalSection title="2. Contact">
        <p className="text-[#475569]">
          Email :{" "}
          <a href={`mailto:${e.contactEmail}`} className="text-primary hover:underline">
            {e.contactEmail}
          </a>
          {legalValue(e.phone, "") && (
            <>
              {" · "}Téléphone : {legalValue(e.phone)}
            </>
          )}
        </p>
      </LegalSection>

      <LegalSection title="3. Hébergement">
        <p className="text-[#475569] mb-3">
          {e.brand} est hébergé par les prestataires suivants :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F7F8FA]">
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Prestataire</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Rôle</th>
                <th className="text-left p-3 border border-[#E5E7EB] font-semibold text-[#0B1220]">Localisation</th>
              </tr>
            </thead>
            <tbody>
              {LEGAL_HOSTS.map((h) => (
                <tr key={h.name}>
                  <td className="p-3 border border-[#E5E7EB] text-[#475569] font-medium">{h.name}</td>
                  <td className="p-3 border border-[#E5E7EB] text-[#475569]">{h.role}</td>
                  <td className="p-3 border border-[#E5E7EB] text-[#475569]">{h.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p className="text-[#475569]">
          La marque {e.brand}, le logo, l&apos;interface, les textes et les éléments graphiques de la
          plateforme sont la propriété exclusive de l&apos;éditeur et sont protégés par le droit de la
          propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans
          autorisation écrite préalable est interdite. Les données et fichiers que vous créez ou
          téléversez restent votre propriété (voir la{" "}
          <a href="/privacy" className="text-primary hover:underline">Politique de confidentialité</a>).
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilité">
        <p className="text-[#475569]">
          L&apos;éditeur s&apos;efforce d&apos;assurer la disponibilité et l&apos;exactitude du service,
          sans garantie d&apos;absence d&apos;interruption ou d&apos;erreur. Les documents générés par
          intelligence artificielle doivent être vérifiés avant tout usage professionnel ou légal. Les
          conditions d&apos;utilisation détaillées figurent dans les{" "}
          <a href="/terms" className="text-primary hover:underline">Conditions Générales d&apos;Utilisation</a>.
        </p>
      </LegalSection>

      <LegalSection title="6. Droit applicable">
        <p className="text-[#475569]">
          Les présentes mentions légales sont régies par le droit marocain. Tout litige relatif au site
          ou au service relève de la compétence des tribunaux de Casablanca, Maroc.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
