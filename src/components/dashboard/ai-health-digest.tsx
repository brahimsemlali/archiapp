"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface DigestData {
  overdueInvoices: Array<{ number: string; amount: number; daysLate: number; client: string }>;
  expiringDevis: Array<{ number: string; daysLeft: number }>;
  budgetOverruns: Array<{ project: string; overrunPct: number }>;
  upcomingDeadlines: Array<{ project: string; daysLeft: number }>;
  totalOutstanding: number;
}

interface Props {
  data: DigestData;
  aiEnabled: boolean;
}

export function AiHealthDigest({ data, aiEnabled }: Props) {
  const [digest, setDigest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function generateDigest() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { digest?: string; error?: string };
      if (!res.ok || !json.digest) throw new Error(json.error ?? "Erreur serveur");
      setDigest(json.digest);
      setExpanded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de générer le bilan.");
    } finally {
      setLoading(false);
    }
  }

  const hasAlerts = data.overdueInvoices.length > 0 || data.expiringDevis.length > 0 || data.budgetOverruns.length > 0;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <p className="text-sm font-semibold text-[#0B1220]">Bilan IA</p>
          {hasAlerts && (
            <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded-full">
              {data.overdueInvoices.length + data.expiringDevis.length + data.budgetOverruns.length} alertes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {digest && (
            <button onClick={() => setExpanded((v) => !v)} className="text-[#64748B] hover:text-[#0B1220]">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <Button size="sm" variant="outline" onClick={generateDigest} disabled={loading || !aiEnabled} className="h-7 text-xs gap-1.5">
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {loading ? "Analyse…" : "Générer"}
          </Button>
        </div>
      </div>

      {digest && expanded && (
        <div className="mt-3 text-sm text-[#1E293B] leading-relaxed whitespace-pre-wrap border-t border-[#E5E7EB] pt-3">
          {digest}
        </div>
      )}

      {!digest && (
        <p className="text-xs text-[#64748B] mt-2">
          {aiEnabled
            ? "Résumé hebdomadaire de la santé financière et opérationnelle du cabinet — généré par IA."
            : "Le plan Basic fonctionne sans IA. Les bilans générés sont disponibles sur les plans Studio AI et Agence AI."}
        </p>
      )}
    </div>
  );
}
