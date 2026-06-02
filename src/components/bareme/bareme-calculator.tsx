"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMAD } from "@/lib/format";
import { Info, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// ONA barème rates based on Loi 016-89 and ONA circulaire
// Rates vary by category and tranches of budget cost
const CATEGORIES = [
  { value: "residentiel_simple", label: "Résidentiel simple (logement économique)", baseRate: 0.06 },
  { value: "residentiel_standing", label: "Résidentiel standing / villas", baseRate: 0.09 },
  { value: "tertiaire_bureaux", label: "Tertiaire — bureaux / commerces", baseRate: 0.08 },
  { value: "tertiaire_hospitalier", label: "Hospitalier / éducatif", baseRate: 0.10 },
  { value: "industriel", label: "Industriel / entrepôt", baseRate: 0.05 },
  { value: "renovation", label: "Réhabilitation / rénovation", baseRate: 0.12 },
  { value: "equipement_public", label: "Équipement public / culturel", baseRate: 0.11 },
  { value: "interieur", label: "Architecture intérieure / décoration", baseRate: 0.15 },
];

const PHASES = [
  { key: "esq", label: "Esquisse (ESQ)", pct: 0.05 },
  { key: "aps", label: "Avant-Projet Sommaire (APS)", pct: 0.08 },
  { key: "apd", label: "Avant-Projet Définitif (APD)", pct: 0.12 },
  { key: "pc", label: "Permis de construire (PC)", pct: 0.05 },
  { key: "dce", label: "Dossier de Consultation (DCE)", pct: 0.10 },
  { key: "dir_chantier", label: "Direction artistique chantier", pct: 0.35 },
  { key: "reception", label: "Réception des travaux", pct: 0.05 },
] as const;

const TOTAL_PHASES_PCT = PHASES.reduce((s, p) => s + p.pct, 0);

// Dégressivité: fee rate decreases as budget increases (tranches)
function computeHonoraires(budgetMAD: number, baseRate: number): number {
  // Tranche system (simplified ONA):
  // 0–500k MAD: full base rate
  // 500k–2M MAD: 90% of base rate
  // 2M–10M MAD: 80% of base rate
  // >10M MAD: 70% of base rate
  let honoraires = 0;
  if (budgetMAD <= 500_000) {
    honoraires = budgetMAD * baseRate;
  } else if (budgetMAD <= 2_000_000) {
    honoraires = 500_000 * baseRate + (budgetMAD - 500_000) * baseRate * 0.9;
  } else if (budgetMAD <= 10_000_000) {
    honoraires = 500_000 * baseRate + 1_500_000 * baseRate * 0.9 + (budgetMAD - 2_000_000) * baseRate * 0.8;
  } else {
    honoraires = 500_000 * baseRate + 1_500_000 * baseRate * 0.9 + 8_000_000 * baseRate * 0.8 + (budgetMAD - 10_000_000) * baseRate * 0.7;
  }
  return honoraires;
}

export function BaremeCalculator() {
  const [budget, setBudget] = useState("");
  const [surface, setSurface] = useState("");
  const [category, setCategory] = useState("residentiel_standing");
  const [missionType, setMissionType] = useState<"complete" | "partielle">("complete");
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set(PHASES.map((p) => p.key)));
  const [copied, setCopied] = useState(false);

  const budgetVal = parseFloat(budget.replace(/\s/g, "").replace(",", ".")) || 0;
  const surfaceVal = parseFloat(surface.replace(/\s/g, "").replace(",", ".")) || 0;
  const cat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[1]!;

  const totalHonoraires = computeHonoraires(budgetVal, cat.baseRate);
  const unitCost = surfaceVal > 0 ? budgetVal / surfaceVal : 0;
  const feePerM2 = surfaceVal > 0 ? totalHonoraires / surfaceVal : 0;

  const selectedPhasesPct = PHASES.filter((p) => selectedPhases.has(p.key)).reduce((s, p) => s + p.pct, 0);
  const partialHonoraires = missionType === "partielle"
    ? totalHonoraires * (selectedPhasesPct / TOTAL_PHASES_PCT)
    : totalHonoraires;

  const displayHonoraires = missionType === "partielle" ? partialHonoraires : totalHonoraires;
  const displayTTC = displayHonoraires * 1.20;

  function togglePhase(key: string) {
    setSelectedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function copyResult() {
    const text = `Honoraires HT: ${displayHonoraires.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD\nTVA 20%: ${(displayHonoraires * 0.20).toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD\nTotal TTC: ${displayTTC.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Résultat copié.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0B1220]">Paramètres du projet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Catégorie de mission</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-[#64748B]">Taux de base : {(cat.baseRate * 100).toFixed(0)}% du coût de construction</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget">Coût estimé des travaux (MAD HT)</Label>
              <Input
                id="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex : 2 500 000"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="surface">Surface (m²) — optionnel</Label>
              <Input
                id="surface"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                placeholder="Ex : 350"
              />
              {surfaceVal > 0 && budgetVal > 0 && (
                <p className="text-[11px] text-[#64748B]">Coût au m² : {unitCost.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD/m²</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Type de mission</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMissionType("complete")}
                  className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${missionType === "complete" ? "bg-[#0B1220] text-white border-[#0B1220]" : "border-[#E5E7EB] text-[#64748B] hover:border-[#0B1220]"}`}
                >
                  Mission complète
                </button>
                <button
                  onClick={() => setMissionType("partielle")}
                  className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${missionType === "partielle" ? "bg-[#0B1220] text-white border-[#0B1220]" : "border-[#E5E7EB] text-[#64748B] hover:border-[#0B1220]"}`}
                >
                  Mission partielle
                </button>
              </div>
            </div>

            {missionType === "partielle" && (
              <div className="space-y-2">
                <Label>Phases incluses</Label>
                <div className="space-y-1">
                  {PHASES.map((p) => (
                    <label key={p.key} className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded hover:bg-[#F1F5F9]">
                      <input
                        type="checkbox"
                        checked={selectedPhases.has(p.key)}
                        onChange={() => togglePhase(p.key)}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{p.label}</span>
                      <span className="text-xs text-[#64748B]">{(p.pct * 100).toFixed(0)}%</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[#64748B]">Phases sélectionnées : {(selectedPhasesPct * 100).toFixed(0)}% de la mission complète</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card className="border-[#E5E7EB]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0B1220] flex items-center justify-between">
                Résultat
                {budgetVal > 0 && (
                  <button onClick={copyResult} className="flex items-center gap-1 text-[11px] text-[#64748B] hover:text-[#0B1220]">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    Copier
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {budgetVal === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-6">Saisissez le coût des travaux pour calculer.</p>
              ) : (
                <>
                  <div className="bg-[#F1F5F9] rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Honoraires HT</span>
                      <span className="font-bold text-[#0B1220] text-base">{formatMAD(Math.round(displayHonoraires * 100))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">TVA 20%</span>
                      <span className="font-medium">{formatMAD(Math.round(displayHonoraires * 0.20 * 100))}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-[#E5E7EB] pt-2.5">
                      <span className="font-semibold text-[#0B1220]">Total TTC</span>
                      <span className="font-bold text-[#0B1220] text-xl">{formatMAD(Math.round(displayTTC * 100))}</span>
                    </div>
                  </div>

                  {surfaceVal > 0 && (
                    <div className="flex justify-between text-sm text-[#64748B]">
                      <span>Honoraires par m²</span>
                      <span className="font-medium">{feePerM2.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD/m²</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-[#64748B]">
                    <span>Taux effectif appliqué</span>
                    <span className="font-medium">{((displayHonoraires / budgetVal) * 100).toFixed(2)}%</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Phase breakdown */}
          {budgetVal > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Ventilation par phase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PHASES.map((p) => {
                  const phaseAmt = displayHonoraires * (p.pct / (missionType === "partielle" ? selectedPhasesPct || 1 : TOTAL_PHASES_PCT));
                  const isActive = missionType === "complete" || selectedPhases.has(p.key);
                  return (
                    <div key={p.key} className={`flex items-center gap-3 text-sm ${!isActive ? "opacity-30" : ""}`}>
                      <span className="flex-1 text-[#64748B] text-xs">{p.label}</span>
                      <span className="font-medium tabular-nums">{formatMAD(Math.round(phaseAmt * 100))}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2 text-sm text-amber-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Référence légale</p>
              <p className="text-xs">Calcul basé sur le barème indicatif de l'Ordre National des Architectes (ONA) — Dahir 016-89 portant code de déontologie architecturale et barème des honoraires. Les taux présentés sont indicatifs ; négociation libre pour projets privés. Pour projets soumis aux marchés publics, le barème officiel s'applique.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
