"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PLAN_LIMITS } from "@/lib/billing/plans";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

const STUDIO_FEATURES = [
  "Projets illimités",
  `${PLAN_LIMITS.studio.seats} membres d'équipe`,
  `${PLAN_LIMITS.studio.storageGb} Go de stockage`,
  `${PLAN_LIMITS.studio.aiCalls} appels IA / mois`,
  "Contrats IA (loi 016-89)",
  "Résumés de visites IA",
  "Email client automatisé",
];

export function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">Passez à Studio AI</DialogTitle>
          <DialogDescription className="text-center text-sm">
            {reason ?? "Vous avez atteint la limite de votre plan actuel."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
          {STUDIO_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 shrink-0 text-green-500" />
              {f}
            </div>
          ))}
        </div>

        <div className="mt-2 space-y-2">
          <div className="text-center">
            <span className="text-2xl font-bold text-slate-900">{PLAN_LIMITS.studio.monthlyPriceMad} MAD</span>
            <span className="text-sm text-slate-400"> / mois</span>
          </div>
          <Link href="/settings?tab=billing" onClick={() => onOpenChange(false)}>
            <Button className="w-full gap-2">
              Passer à Studio AI
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" className="w-full text-sm text-slate-400" onClick={() => onOpenChange(false)}>
            Continuer avec le plan Basic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
