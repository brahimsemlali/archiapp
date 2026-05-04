"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contractGenerateSchema, type ContractGenerateValues } from "@/lib/validators/contract";
import { generateContractAction } from "@/lib/actions/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

const CONTRACT_TYPES = [
  { value: "mission_complete", label: "Mission complète" },
  { value: "mission_partielle", label: "Mission partielle" },
  { value: "etude_faisabilite", label: "Étude de faisabilité" },
  { value: "suivi_chantier", label: "Suivi de chantier" },
  { value: "autre", label: "Autre" },
] as const;

const MISSION_PHASES = [
  "Esquisse",
  "APS",
  "APD",
  "PC",
  "DCE",
  "Suivi de chantier",
  "Réception",
];

const PAYMENT_TEMPLATES = [
  { label: "Standard 30/30/30/10", value: "30% à la signature, 30% à la remise de l'APD, 30% au dépôt du PC, 10% à la réception." },
  { label: "Deux versements", value: "50% à la signature, 50% à la remise des plans définitifs." },
  { label: "Mensuel", value: "Paiement mensuel sur toute la durée de la mission." },
];

interface ContractGenerateFormProps {
  clients: { id: string; name: string; type: string }[];
  preselectedProjectId?: string;
  preselectedClientId?: string;
}

export function ContractGenerateForm({
  clients,
  preselectedProjectId,
  preselectedClientId,
}: ContractGenerateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractGenerateValues>({
    resolver: zodResolver(contractGenerateSchema),
    defaultValues: {
      projectId: preselectedProjectId,
      clientId: preselectedClientId,
      type: "mission_complete",
      missionScope: [],
      paymentSchedule: "30% à la signature, 30% à la remise de l'APD, 30% au dépôt du PC, 10% à la réception.",
    },
  });

  function togglePhase(phase: string) {
    const next = selectedPhases.includes(phase)
      ? selectedPhases.filter((p) => p !== phase)
      : [...selectedPhases, phase];
    setSelectedPhases(next);
    setValue("missionScope", next);
  }

  async function onSubmit(values: ContractGenerateValues) {
    setLoading(true);
    const result = await generateContractAction(values);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Contrat généré avec succès.");
    router.push(`/contracts/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select
            defaultValue={preselectedClientId}
            onValueChange={(v) => { if (v) setValue("clientId", v); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clientId && (
            <p className="text-xs text-destructive">{errors.clientId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Type de contrat *</Label>
          <Select
            defaultValue="mission_complete"
            onValueChange={(v) => { if (v) setValue("type", v as ContractGenerateValues["type"]); }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Périmètre de mission *</Label>
        <div className="flex flex-wrap gap-2">
          {MISSION_PHASES.map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => togglePhase(phase)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedPhases.includes(phase)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-accent"
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
        {errors.missionScope && (
          <p className="text-xs text-destructive">{errors.missionScope.message}</p>
        )}
        {selectedPhases.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedPhases.map((p) => (
              <Badge key={p} variant="secondary" className="gap-1">
                {p}
                <button type="button" onClick={() => togglePhase(p)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="feesMad">Honoraires HT (MAD) *</Label>
        <Input
          id="feesMad"
          {...register("feesMad")}
          type="number"
          min="0"
          step="0.01"
          placeholder="150000"
        />
        {errors.feesMad && (
          <p className="text-xs text-destructive">{errors.feesMad.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Modalités de paiement *</Label>
        <div className="flex gap-2 flex-wrap mb-2">
          {PAYMENT_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setValue("paymentSchedule", t.value)}
              className="text-xs px-2 py-1 rounded border hover:bg-accent transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
        <Textarea
          {...register("paymentSchedule")}
          rows={3}
          placeholder="30% à la signature, ..."
        />
        {errors.paymentSchedule && (
          <p className="text-xs text-destructive">{errors.paymentSchedule.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadlines">Délais</Label>
        <Input
          id="deadlines"
          {...register("deadlines")}
          placeholder="Ex: Esquisse sous 3 semaines, APD sous 6 semaines..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialClauses">Clauses particulières</Label>
        <Textarea
          id="specialClauses"
          {...register("specialClauses")}
          rows={3}
          placeholder="Toute clause spécifique à inclure dans le contrat..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Génération en cours... (30-60 secondes)
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Générer le contrat avec IA
          </>
        )}
      </Button>
    </form>
  );
}
