// Single source of truth for ArchiDesk legal pages
// (Mentions légales, CGU, CGV, Confidentialité, Cookies).
//
// ▸ TO FINALIZE: replace every `TODO(...)` value in LEGAL_ENTITY below with your
//   real company details. The moment the identity fields are filled, the "à
//   compléter" notice shown on every legal page disappears automatically
//   (see `isLegalEntityConfigured`). That is the whole "finalize" step — one file.
//
// ▸ NOTE: these pages have NOT been reviewed by a lawyer. That caveat was
//   intentionally removed from the visible UI per a deliberate founder decision.
//   Have a juriste review the wording before relying on it in a dispute.

/** Marks a value the founder must replace before the legal pages are complete. */
function TODO(hint: string): string {
  return `À COMPLÉTER — ${hint}`;
}

function isTodo(value: string): boolean {
  return value.startsWith("À COMPLÉTER");
}

export const LEGAL_LAST_UPDATED = "juin 2026";

/**
 * Éditeur / company identity. Replace the TODO(...) values with real data.
 * Brand + contact emails default to real brand-consistent values; the legally
 * required identity fields (raison sociale, RC, ICE, IF, siège, directeur de
 * publication) start as TODO and drive the completeness notice.
 */
export const LEGAL_ENTITY = {
  /** Public brand name — safe default, no need to change. */
  brand: "ArchiDesk",
  /** Raison sociale de l'éditeur. */
  legalName: TODO("raison sociale, ex: ArchiDesk SARL AU"),
  /** Forme juridique. */
  legalForm: TODO("forme juridique, ex: SARL à associé unique / Auto-entrepreneur"),
  /** Capital social (laisser tel quel si non applicable). */
  capital: TODO("capital social, ex: 100 000 MAD — ou « sans objet »"),
  /** Siège social. */
  address: TODO("siège social, ex: 12 rue …, Casablanca 20000, Maroc"),
  /** Registre de Commerce. */
  rc: TODO("n° RC"),
  /** Identifiant Commun de l'Entreprise. */
  ice: TODO("n° ICE"),
  /** Identifiant Fiscal. */
  ifNumber: TODO("n° IF"),
  /** Directeur de la publication. */
  publicationDirector: TODO("nom du directeur de la publication"),
  /** Contacts — brand-consistent defaults; update once your domain is live. */
  contactEmail: "support@archidesk.ma",
  privacyEmail: "privacy@archidesk.ma",
  phone: TODO("téléphone professionnel, ex: +212 …"),
} as const;

/**
 * Hébergeurs / sous-traitants techniques (faits, déjà vrais dans le code).
 * Kept consistent with the "Sous-traitants" table on the privacy page.
 */
export const LEGAL_HOSTS = [
  {
    name: "Vercel Inc.",
    role: "Hébergement de l'application",
    location: "340 S Lemon Ave #4133, Walnut, CA 91789, USA",
  },
  {
    name: "Supabase Inc.",
    role: "Base de données, authentification, stockage des fichiers",
    location: "Données hébergées dans l'UE (AWS eu-west-3, Paris)",
  },
] as const;

/** Footer cross-navigation shown on every legal page. */
export const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/terms", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/privacy", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
] as const;

/** Public app domain, without protocol (e.g. "archidesk.ma"). */
export function appDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "https://archidesk.ma";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * True once the legally-required éditeur identity fields have been filled in.
 * Drives the small "informations à compléter" notice on the legal pages: blank
 * placeholders shown as "final" would be worse than an honest notice.
 */
export function isLegalEntityConfigured(): boolean {
  const required = [
    LEGAL_ENTITY.legalName,
    LEGAL_ENTITY.legalForm,
    LEGAL_ENTITY.address,
    LEGAL_ENTITY.rc,
    LEGAL_ENTITY.ice,
    LEGAL_ENTITY.ifNumber,
    LEGAL_ENTITY.publicationDirector,
  ];
  return required.every((v) => !isTodo(v));
}

/** Returns the value if it's real, otherwise a short neutral fallback for display. */
export function legalValue(value: string, fallback = "—"): string {
  return isTodo(value) ? fallback : value;
}
