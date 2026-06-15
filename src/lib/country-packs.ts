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
}

export const COUNTRY_PACKS = {
  MA: {
    code: "MA",
    labels: { fr: "Maroc", en: "Morocco", ar: "المغرب" },
    currency: "MAD",
    taxLabel: "TVA",
    defaultTaxRate: 20,
    timezone: "Africa/Casablanca",
    defaultLocale: "fr",
  },
  DZ: {
    code: "DZ",
    labels: { fr: "Algérie", en: "Algeria", ar: "الجزائر" },
    currency: "DZD",
    taxLabel: "TVA",
    defaultTaxRate: 19,
    timezone: "Africa/Algiers",
    defaultLocale: "fr",
  },
  TN: {
    code: "TN",
    labels: { fr: "Tunisie", en: "Tunisia", ar: "تونس" },
    currency: "TND",
    taxLabel: "TVA",
    defaultTaxRate: 19,
    timezone: "Africa/Tunis",
    defaultLocale: "fr",
  },
  FR: {
    code: "FR",
    labels: { fr: "France", en: "France", ar: "فرنسا" },
    currency: "EUR",
    taxLabel: "TVA",
    defaultTaxRate: 20,
    timezone: "Europe/Paris",
    defaultLocale: "fr",
  },
  AE: {
    code: "AE",
    labels: { fr: "Émirats arabes unis", en: "United Arab Emirates", ar: "الإمارات" },
    currency: "AED",
    taxLabel: "VAT",
    defaultTaxRate: 5,
    timezone: "Asia/Dubai",
    defaultLocale: "en",
  },
  SA: {
    code: "SA",
    labels: { fr: "Arabie saoudite", en: "Saudi Arabia", ar: "السعودية" },
    currency: "SAR",
    taxLabel: "VAT",
    defaultTaxRate: 15,
    timezone: "Asia/Riyadh",
    defaultLocale: "ar",
  },
  INTL: {
    code: "INTL",
    labels: { fr: "International", en: "International", ar: "دولي" },
    currency: "USD",
    taxLabel: "Tax",
    defaultTaxRate: 0,
    timezone: "UTC",
    defaultLocale: "en",
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
