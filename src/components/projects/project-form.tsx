"use client";

import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, type ProjectFormValues } from "@/lib/validators/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface ProjectFormProps {
  clients: Client[];
  defaultValues?: Partial<ProjectFormValues>;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  loading?: boolean;
}

const PROJECT_TYPES = [
  { value: "villa", label: "Villa" },
  { value: "appartement", label: "Appartement" },
  { value: "immeuble", label: "Immeuble" },
  { value: "commercial", label: "Commercial" },
  { value: "renovation", label: "Rénovation" },
  { value: "amenagement", label: "Aménagement" },
  { value: "autre", label: "Autre" },
] as const;

const PHASES = [
  { value: "esquisse", label: "Esquisse" },
  { value: "aps", label: "APS" },
  { value: "apd", label: "APD" },
  { value: "pc", label: "PC" },
  { value: "dce", label: "DCE" },
  { value: "chantier", label: "Chantier" },
  { value: "reception", label: "Réception" },
  { value: "termine", label: "Terminé" },
] as const;

const STATUSES = [
  { value: "actif", label: "Actif" },
  { value: "en_attente", label: "En attente" },
  { value: "suspendu", label: "Suspendu" },
  { value: "termine", label: "Terminé" },
  { value: "archive", label: "Archivé" },
] as const;

export function ProjectForm({ clients, defaultValues, onSubmit, loading }: ProjectFormProps) {
  const tPhase = useTranslations("phase");
  const tType = useTranslations("projectType");
  const tStatus = useTranslations("status.project");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      phase: "esquisse",
      status: "actif",
      type: "villa",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="title">Titre du projet *</Label>
          <Input id="title" {...register("title")} placeholder="Villa Benali — Rabat" />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Client *</Label>
          <Select
            defaultValue={defaultValues?.clientId ?? undefined}
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
          <Label>Type</Label>
          <Select
            defaultValue={defaultValues?.type ?? "villa"}
            onValueChange={(v) => setValue("type", v as ProjectFormValues["type"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map(({ value }) => (
                <SelectItem key={value} value={value}>{tType.has(value) ? tType(value) : value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Phase</Label>
          <Select
            defaultValue={defaultValues?.phase ?? "esquisse"}
            onValueChange={(v) => setValue("phase", v as ProjectFormValues["phase"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map(({ value }) => (
                <SelectItem key={value} value={value}>{tPhase.has(value) ? tPhase(value) : value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Statut</Label>
          <Select
            defaultValue={defaultValues?.status ?? "actif"}
            onValueChange={(v) => setValue("status", v as ProjectFormValues["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(({ value }) => (
                <SelectItem key={value} value={value}>{tStatus.has(value) ? tStatus(value) : value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="address">Adresse du projet</Label>
          <Input id="address" {...register("address")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="surfaceM2">Surface (m²)</Label>
          <Input id="surfaceM2" {...register("surfaceM2")} type="number" min="0" step="0.01" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fees">Honoraires (MAD)</Label>
          <Input id="fees" {...register("fees")} type="number" min="0" step="0.01" placeholder="0.00" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budgetEstimate">Budget estimé (MAD)</Label>
          <Input id="budgetEstimate" {...register("budgetEstimate")} type="number" min="0" step="0.01" placeholder="0.00" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Date de début</Label>
          <Input id="startDate" {...register("startDate")} type="date" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetEndDate">Date de fin prévue</Label>
          <Input id="targetEndDate" {...register("targetEndDate")} type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} rows={4} placeholder="Notes sur le projet..." />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
