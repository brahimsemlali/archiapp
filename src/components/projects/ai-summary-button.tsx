"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { generateProjectSummaryAction } from "@/lib/actions/ai";

export function AiSummaryButton({ projectId, aiEnabled }: { projectId: string; aiEnabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateProjectSummaryAction(projectId);
    setLoading(false);
    if (!result.ok) { toast.error(result.error); return; }
    setSummary(result.data.summary);
  }

  async function handleCopy() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
        onClick={handleGenerate}
        disabled={loading || !aiEnabled}
        title={aiEnabled ? "Générer un résumé IA" : "Disponible sur Studio AI et Agence AI"}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {aiEnabled ? "Résumé IA" : "IA non incluse"}
      </Button>

      {summary && (
        <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-slate-700 leading-relaxed relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Résumé généré par IA
            </p>
            <div className="flex gap-1">
              <button onClick={handleCopy} className="p-1 rounded hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setSummary(null)} className="p-1 rounded hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  );
}
