import { formatDistance } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { fr, enGB, ar } from "date-fns/locale";
import type { Locale } from "date-fns";
import { getCurrencyDisplay } from "@/lib/country-packs";

/**
 * Currency-aware money formatting (centimes → display string).
 * MAD keeps the historical "1 234,56 DH" output exactly.
 */
export function formatMoney(centimes: number, currency: string = "MAD"): string {
  const amount = centimes / 100;
  const display = getCurrencyDisplay(currency);
  if (display.suffix) {
    return (
      new Intl.NumberFormat(display.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ` ${display.suffix}`
    );
  }
  return new Intl.NumberFormat(display.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** @deprecated Use formatMoney(centimes, currency) — kept as the MAD shorthand. */
export function formatMAD(centimes: number): string {
  return formatMoney(centimes, "MAD");
}

export function centimsToInput(centimes: number): string {
  return (centimes / 100).toFixed(2);
}

export function inputToCentimes(value: string): number {
  return Math.round(parseFloat(value) * 100);
}

// "en" → en-GB so dates stay day-first (the W2 fix localizes month *names*, not order).
// date-fns `ar` renders Arabic month names with Latin digits — consistent with the
// Latin-digit money formatting (fr-MA), so no Arabic-Indic/Latin digit mismatch.
const DATE_LOCALES: Record<string, Locale> = { fr, en: enGB, ar };

const DEFAULT_TIMEZONE = "Africa/Casablanca";

function dateLocale(locale?: string): Locale {
  return DATE_LOCALES[locale ?? "fr"] ?? fr;
}

export function formatDate(date: string | Date, locale?: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, "d MMMM yyyy", { locale: dateLocale(locale) });
}

export function formatDateShort(date: string | Date, locale?: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, "dd/MM/yyyy", { locale: dateLocale(locale) });
}

// "15 juin" / "15 Jun" / "15 يونيو" — day + short month, no year (compact lists, task chips).
export function formatDayMonth(date: string | Date, locale?: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, "dd MMM", { locale: dateLocale(locale) });
}

// BCP-47 tags: "en" → en-GB (day-first), "ar" plain. numberingSystem is forced to
// Latin below so Arabic dates use Latin digits, matching the fr-MA money formatting.
const LOCALE_TAGS: Record<string, string> = { fr: "fr-FR", en: "en-GB", ar: "ar" };

/**
 * Locale + timezone aware date formatting with caller-chosen Intl options
 * (weekday, custom parts…). For the standard day/month/year shapes prefer
 * formatDate / formatDateShort / formatDayMonth. Arabic renders with Latin digits.
 */
export function formatDateIntl(
  date: string | Date,
  options: Intl.DateTimeFormatOptions,
  locale?: string,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale ?? "fr"] ?? "fr-FR", {
    ...options,
    timeZone,
    numberingSystem: "latn",
  }).format(d);
}

// Relative ("il y a 2 jours" / "2 days ago") — elapsed duration is timezone-independent.
export function formatRelative(date: string | Date, locale?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistance(d, new Date(), { locale: dateLocale(locale), addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}
