"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/lib/actions/locale";

const LOCALES = [
  { key: "fr" as const, label: "FR", flag: "🇫🇷", name: "Français" },
  { key: "en" as const, label: "EN", flag: "🇬🇧", name: "English" },
  { key: "ar" as const, label: "AR", flag: "🇲🇦", name: "العربية" },
];

interface LanguageSwitcherProps {
  currentLocale: string;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  function switchTo(locale: "fr" | "en" | "ar") {
    if (locale === currentLocale) return;
    startTransition(() => {
      setLocaleAction(locale);
    });
  }

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F1F5F9] border border-[#E5E7EB]">
      {LOCALES.map((loc) => {
        const isActive = currentLocale === loc.key;
        return (
          <button
            key={loc.key}
            onClick={() => switchTo(loc.key)}
            disabled={isPending}
            title={loc.name}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-100
              ${isActive
                ? "bg-white text-[#0B1220] shadow-sm"
                : "text-[#64748B] hover:text-[#0B1220] hover:bg-white/60"
              }
              ${isPending ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <span className="text-[13px] leading-none">{loc.flag}</span>
            <span className="hidden sm:inline">{loc.label}</span>
          </button>
        );
      })}
    </div>
  );
}
