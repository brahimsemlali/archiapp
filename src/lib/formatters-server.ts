import "server-only";
import { getLocale } from "next-intl/server";
import { formatDate, formatDateShort, formatDayMonth, formatDateIntl, formatRelative } from "@/lib/format";

/**
 * Locale-aware date formatters for server components (worldwide.md W2).
 * Reads the current UI locale once via next-intl; destructure with the same
 * names as the `@/lib/format` functions so existing call sites stay unchanged:
 *
 *   const { formatDate, formatRelative } = await getServerFormatters(localization.timezone);
 *
 * `timeZone` defaults to Africa/Casablanca (correct for every current workspace);
 * pass the workspace timezone where it's already loaded for non-MA correctness.
 */
export async function getServerFormatters(timeZone?: string) {
  const locale = await getLocale();
  return {
    locale,
    formatDate: (date: string | Date) => formatDate(date, locale, timeZone),
    formatDateShort: (date: string | Date) => formatDateShort(date, locale, timeZone),
    formatDayMonth: (date: string | Date) => formatDayMonth(date, locale, timeZone),
    formatDateParts: (date: string | Date, options: Intl.DateTimeFormatOptions) =>
      formatDateIntl(date, options, locale, timeZone),
    formatRelative: (date: string | Date) => formatRelative(date, locale),
  };
}
