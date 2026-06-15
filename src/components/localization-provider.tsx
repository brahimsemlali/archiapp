"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocale } from "next-intl";
import { formatMoney, formatDate, formatDateShort, formatDayMonth, formatDateIntl, formatRelative } from "@/lib/format";
import type { WorkspaceLocalization } from "@/lib/country-packs";

interface LocalizationContextValue extends WorkspaceLocalization {
  /** formatMoney bound to the workspace currency */
  money: (centimes: number) => string;
}

interface LocalizationHookValue extends LocalizationContextValue {
  /** Date formatters bound to the current UI locale + workspace timezone */
  formatDate: (date: string | Date) => string;
  formatDateShort: (date: string | Date) => string;
  formatDayMonth: (date: string | Date) => string;
  formatDateParts: (date: string | Date, options: Intl.DateTimeFormatOptions) => string;
  formatRelative: (date: string | Date) => string;
}

const FALLBACK: WorkspaceLocalization = {
  country: "MA",
  currency: "MAD",
  timezone: "Africa/Casablanca",
  defaultTaxRate: 20,
  taxLabel: "TVA",
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({
  value,
  children,
}: {
  value: WorkspaceLocalization;
  children: React.ReactNode;
}) {
  const contextValue = useMemo<LocalizationContextValue>(
    () => ({ ...value, money: (centimes: number) => formatMoney(centimes, value.currency) }),
    [value]
  );
  return <LocalizationContext.Provider value={contextValue}>{children}</LocalizationContext.Provider>;
}

/**
 * Workspace localization + locale-aware formatters in client components.
 * `money` follows the workspace currency; the date formatters follow the current
 * UI locale (fr/en/ar) and the workspace timezone. Falls back to the Morocco pack
 * outside the provider (e.g. public pages), preserving historical behavior.
 */
export function useLocalization(): LocalizationHookValue {
  const ctx = useContext(LocalizationContext);
  const locale = useLocale();
  return useMemo<LocalizationHookValue>(() => {
    const base =
      ctx ?? { ...FALLBACK, money: (centimes: number) => formatMoney(centimes, FALLBACK.currency) };
    return {
      ...base,
      formatDate: (date) => formatDate(date, locale, base.timezone),
      formatDateShort: (date) => formatDateShort(date, locale, base.timezone),
      formatDayMonth: (date) => formatDayMonth(date, locale, base.timezone),
      formatDateParts: (date, options) => formatDateIntl(date, options, locale, base.timezone),
      formatRelative: (date) => formatRelative(date, locale),
    };
  }, [ctx, locale]);
}
