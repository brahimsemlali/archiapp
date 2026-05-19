"use client";

import { useState } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TrialBannerProps {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || daysLeft <= 0) return null;

  const urgent = daysLeft <= 3;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${
        urgent
          ? "bg-orange-500 text-white"
          : "bg-primary text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>
          {urgent
            ? `Votre essai expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""} — ne perdez pas vos données.`
            : `Essai gratuit : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}.`}
        </span>
        <Link
          href="/settings?tab=billing"
          className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold hover:bg-white/30 transition-colors"
        >
          Passer à Studio AI <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-white/20 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
