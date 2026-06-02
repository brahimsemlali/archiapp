"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle, HelpCircle, Loader2, FileText } from "lucide-react";
import { parseBankCsvAction, matchBankLinesAction, markFacturePaidFromBankAction, type MatchedLine } from "@/lib/actions/bank-reconciliation";
import { formatMAD } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BankReconciliation() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchedLine[] | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    const text = await file.text();
    const parseResult = await parseBankCsvAction(text);
    if (!parseResult.ok) { toast.error(parseResult.error); setLoading(false); return; }
    if (parseResult.data.lines.length === 0) {
      toast.error("Aucune ligne détectée. Vérifiez le format CSV (colonnes : date, description, montant).");
      setLoading(false);
      return;
    }
    const matchResult = await matchBankLinesAction(parseResult.data.lines);
    setLoading(false);
    if (!matchResult.ok) { toast.error(matchResult.error); return; }
    setMatches(matchResult.data.matches);
    toast.success(`${parseResult.data.lines.length} lignes importées.`);
  }

  async function handleApply(match: MatchedLine) {
    if (!match.factureId) return;
    setApplying(match.factureId);
    const result = await markFacturePaidFromBankAction(match.factureId, match.bankLine.date);
    setApplying(null);
    if (!result.ok) { toast.error(result.error); return; }
    setApplied((prev) => new Set([...prev, match.factureId!]));
    toast.success(`Facture ${match.factureNumber} marquée comme payée.`);
  }

  const exactCount = matches?.filter((m) => m.confidence === "exact").length ?? 0;
  const closeCount = matches?.filter((m) => m.confidence === "close").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Rapprochement bancaire</h2>
        <p className="text-xs text-slate-500 mb-4">
          Importez un relevé bancaire CSV pour rapprocher automatiquement vos factures impayées.
          Formats supportés : CIH, Attijari, BMCE, BMCI (CSV standard).
        </p>

        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          {loading ? (
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-2" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          )}
          <p className="text-sm font-medium text-slate-600">
            {loading ? "Analyse en cours…" : "Glissez un fichier CSV ou cliquez pour importer"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Colonnes attendues : date, description, montant</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-500 mb-1">Format CSV attendu :</p>
          <code className="text-xs text-slate-500 font-mono">
            01/05/2025;Virement client XYZ;45000.00<br />
            05/05/2025;CHQ 123456;12000.00
          </code>
        </div>
      </div>

      {matches && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Résultats du rapprochement</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {exactCount} correspondance(s) exacte(s) · {closeCount} approximative(s) · {matches.length - exactCount - closeCount} sans correspondance
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setMatches(null)}>
              Nouvelle importation
            </Button>
          </div>

          <div className="divide-y">
            {matches.map((match, idx) => {
              const isApplied = match.factureId ? applied.has(match.factureId) : false;
              return (
                <div key={idx} className={cn("px-5 py-3 flex items-center gap-4", isApplied && "bg-emerald-50/50")}>
                  <div className="shrink-0">
                    {isApplied ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : match.confidence === "exact" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : match.confidence === "close" ? (
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                    ) : (
                      <HelpCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 truncate">{match.bankLine.description || "—"}</p>
                      {match.confidence !== "none" && (
                        <Badge
                          className={cn(
                            "text-xs border-0",
                            match.confidence === "exact" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {match.confidence === "exact" ? "Correspondance exacte" : "Correspondance approx."}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {match.bankLine.date} · {formatMAD(match.bankLine.amount_centimes / 100)}
                      {match.factureNumber && ` → Facture ${match.factureNumber} (${formatMAD((match.factureAmount ?? 0) / 100)})`}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isApplied ? (
                      <span className="text-xs text-emerald-600 font-medium">Appliqué</span>
                    ) : match.factureId && !isApplied ? (
                      <Button
                        size="sm"
                        variant={match.confidence === "exact" ? "default" : "outline"}
                        className="h-7 text-xs"
                        disabled={applying === match.factureId}
                        onClick={() => handleApply(match)}
                      >
                        {applying === match.factureId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <FileText className="h-3 w-3 mr-1" />
                            Marquer payée
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-300">Non rapproché</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
