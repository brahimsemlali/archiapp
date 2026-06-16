/**
 * Country packs — the worldwide foundation (see worldwide.md).
 *
 * A pack bundles everything market-specific that is NOT derivable from code:
 * currency, tax label/rate, timezone, default locale. Morocco (MA) is pack #1
 * and its values reproduce the app's historical behavior exactly, so existing
 * workspaces never notice. New code must read these values from the workspace
 * localization (config), never hardcode them.
 */

export type AppLocale = "fr" | "en" | "ar";

/** A firm-identity line on documents: which firm_profile column to print + its
 *  label. Labels are jurisdiction terms (NOT locale-translated — "ICE" stays
 *  "ICE" in en/ar UI), same principle as taxLabel. Only packs whose identity
 *  columns actually exist get a non-empty list (see firmIdentityFields below). */
export interface FirmIdentityField {
  key: string;
  label: string;
}

export interface CountryPack {
  /** ISO 3166-1 alpha-2 */
  code: string;
  labels: Record<AppLocale, string>;
  /** ISO 4217 */
  currency: string;
  /** Label shown next to tax rates: TVA, VAT… */
  taxLabel: string;
  /** Percent, e.g. 20 */
  defaultTaxRate: number;
  /** IANA timezone */
  timezone: string;
  defaultLocale: AppLocale;
  /** Document number prefixes: {prefix}-{YYYY}-{NNN}. The DB counter keys on
   *  document_type, so the prefix is presentational and safe to vary per pack. */
  invoicePrefix: string;
  quotePrefix: string;
  /** Firm legal-ID lines printed on devis/factures. Empty for packs whose
   *  identity columns don't exist yet — we don't invent SIRET/TRN fields with
   *  no backing column (deferred until those markets + columns land). */
  firmIdentityFields: readonly FirmIdentityField[];
}

// Moroccan legal identifiers — the only identity columns that exist on
// firm_profile today (ice/rc/if_number/patente). CNSS is payroll, omitted from
// commercial documents.
const MA_IDENTITY: FirmIdentityField[] = [
  { key: "ice", label: "ICE" },
  { key: "rc", label: "RC" },
  { key: "if_number", label: "IF" },
  { key: "patente", label: "Patente" },
];

export const COUNTRY_PACKS = {
  MA: {
    code: "MA",
    labels: { fr: "Maroc", en: "Morocco", ar: "المغرب" },
    currency: "MAD",
    taxLabel: "TVA",
    defaultTaxRate: 20,
    timezone: "Africa/Casablanca",
    defaultLocale: "fr",
    invoicePrefix: "FA",
    quotePrefix: "DEV",
    firmIdentityFields: MA_IDENTITY,
  },
  DZ: {
    code: "DZ",
    labels: { fr: "Algérie", en: "Algeria", ar: "الجزائر" },
    currency: "DZD",
    taxLabel: "TVA",
    defaultTaxRate: 19,
    timezone: "Africa/Algiers",
    defaultLocale: "fr",
    invoicePrefix: "FA",
    quotePrefix: "DEV",
    firmIdentityFields: [],
  },
  TN: {
    code: "TN",
    labels: { fr: "Tunisie", en: "Tunisia", ar: "تونس" },
    currency: "TND",
    taxLabel: "TVA",
    defaultTaxRate: 19,
    timezone: "Africa/Tunis",
    defaultLocale: "fr",
    invoicePrefix: "FA",
    quotePrefix: "DEV",
    firmIdentityFields: [],
  },
  FR: {
    code: "FR",
    labels: { fr: "France", en: "France", ar: "فرنسا" },
    currency: "EUR",
    taxLabel: "TVA",
    defaultTaxRate: 20,
    timezone: "Europe/Paris",
    defaultLocale: "fr",
    invoicePrefix: "FA",
    quotePrefix: "DEV",
    firmIdentityFields: [],
  },
  AE: {
    code: "AE",
    labels: { fr: "Émirats arabes unis", en: "United Arab Emirates", ar: "الإمارات" },
    currency: "AED",
    taxLabel: "VAT",
    defaultTaxRate: 5,
    timezone: "Asia/Dubai",
    defaultLocale: "en",
    invoicePrefix: "INV",
    quotePrefix: "QUO",
    firmIdentityFields: [],
  },
  SA: {
    code: "SA",
    labels: { fr: "Arabie saoudite", en: "Saudi Arabia", ar: "السعودية" },
    currency: "SAR",
    taxLabel: "VAT",
    defaultTaxRate: 15,
    timezone: "Asia/Riyadh",
    defaultLocale: "ar",
    invoicePrefix: "INV",
    quotePrefix: "QUO",
    firmIdentityFields: [],
  },
  INTL: {
    code: "INTL",
    labels: { fr: "International", en: "International", ar: "دولي" },
    currency: "USD",
    taxLabel: "Tax",
    defaultTaxRate: 0,
    timezone: "UTC",
    defaultLocale: "en",
    invoicePrefix: "INV",
    quotePrefix: "QUO",
    firmIdentityFields: [],
  },
} as const satisfies Record<string, CountryPack>;

export type CountryCode = keyof typeof COUNTRY_PACKS;

export const DEFAULT_COUNTRY: CountryCode = "MA";

export function getCountryPack(code?: string | null): CountryPack {
  if (code && code in COUNTRY_PACKS) return COUNTRY_PACKS[code as CountryCode];
  return COUNTRY_PACKS[DEFAULT_COUNTRY];
}

/**
 * How each supported currency is displayed. `suffix` currencies keep the
 * Maghreb convention of a short symbol after the amount ("1 234,56 DH");
 * others use the standard Intl currency style.
 */
const CURRENCY_DISPLAY: Record<string, { locale: string; suffix?: string }> = {
  MAD: { locale: "fr-MA", suffix: "DH" },
  DZD: { locale: "fr-DZ", suffix: "DA" },
  TND: { locale: "fr-TN", suffix: "DT" },
  EUR: { locale: "fr-FR" },
  USD: { locale: "en-US" },
  AED: { locale: "en-AE" },
  SAR: { locale: "en-SA" },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_DISPLAY);

export function getCurrencyDisplay(currency: string): { locale: string; suffix?: string } {
  return CURRENCY_DISPLAY[currency] ?? { locale: "en-US" };
}

/**
 * Per-workspace localization resolved from `firm_profile` (columns added by
 * the 20260612_worldwide_localization migration) with country-pack fallbacks.
 * Tolerates rows from before the migration: missing fields resolve to the
 * Morocco pack, i.e. the app's historical behavior.
 */
export interface WorkspaceLocalization {
  country: string;
  currency: string;
  timezone: string;
  defaultTaxRate: number;
  taxLabel: string;
}

/**
 * Firm legal-ID lines to print on documents, resolved from the firm's country
 * pack mapped over its firm_profile row. Empty values are dropped, so a firm
 * that hasn't filled (say) its Patente simply won't show that line. Pass the
 * SAME firm row you resolve currency/tax from (live row, or a frozen snapshot
 * row for sent invoices) so the document renders its own identity.
 */
export function getFirmIdentityLines(
  firmProfile: Record<string, unknown> | null | undefined
): Array<{ label: string; value: string }> {
  if (!firmProfile) return [];
  const pack = getCountryPack(typeof firmProfile.country === "string" ? firmProfile.country : null);
  return pack.firmIdentityFields
    .map((field) => ({ label: field.label, value: String(firmProfile[field.key] ?? "").trim() }))
    .filter((line) => line.value.length > 0);
}

export function resolveLocalization(firmProfile: object | null | undefined): WorkspaceLocalization {
  const profile = firmProfile as
    | { country?: unknown; currency?: unknown; timezone?: unknown; default_tax_rate?: unknown }
    | null
    | undefined;
  const pack = getCountryPack(typeof profile?.country === "string" ? profile.country : null);
  const rawRate = profile?.default_tax_rate;
  const parsedRate = typeof rawRate === "number" ? rawRate : typeof rawRate === "string" ? Number(rawRate) : NaN;
  return {
    country: pack.code,
    currency:
      typeof profile?.currency === "string" && profile.currency in CURRENCY_DISPLAY
        ? profile.currency
        : pack.currency,
    timezone: typeof profile?.timezone === "string" && profile.timezone ? profile.timezone : pack.timezone,
    defaultTaxRate: Number.isFinite(parsedRate) ? parsedRate : pack.defaultTaxRate,
    taxLabel: pack.taxLabel,
  };
}
