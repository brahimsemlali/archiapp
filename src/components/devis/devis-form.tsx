"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { devisFormSchema, type DevisFormValues, type DevisItem } from "@/lib/validators/devis";
import { createDevisAction, updateDevisAction } from "@/lib/actions/devis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { formatMAD } from "@/lib/format";

interface DevisFormProps {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string; client_id: string }[];
  defaultValues?: Partial<DevisFormValues>;
  devisId?: string;
}

function centimesToInput(centimes: number): string {
  return (centimes / 100).toFixed(2);
}

function inputToCentimes(val: string): number {
  return Math.round(parseFloat(val || "0") * 100);
}

function newItem(): DevisItem {
  return {
    id: globalThis.crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "forfait",
    unitPriceCentimes: 0,
  };
}

export function DevisForm({ clients, projects, defaultValues, devisId }: DevisFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<DevisFormValues, unknown, DevisFormValues>({
    resolver: zodResolver(devisFormSchema) as never,
    defaultValues: {
      title: "",
      clientId: "",
      projectId: undefined,
      items: [newItem()],
      tvaRate: 20,
      notes: "",
      validUntil: "",
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = useWatch({ control: form.control, name: "items" }) ?? [];
  const watchTvaRate = useWatch({ control: form.control, name: "tvaRate" });
  const watchClientId = useWatch({ control: form.control, name: "clientId" });
  const watchProjectId = useWatch({ control: form.control, name: "projectId" });

  const clientProjects = projects.filter((p) => p.client_id === watchClientId);

  const subtotal = watchItems.reduce((sum, item) => {
    const price = typeof item.unitPriceCentimes === "number" ? item.unitPriceCentimes : 0;
    const qty = typeof item.quantity === "number" ? item.quantity : 0;
    return sum + Math.round(qty * price);
  }, 0);
  const tva = Math.round(subtotal * (watchTvaRate || 20) / 100);
  const total = subtotal + tva;

  const onSubmit = useCallback(async (values: DevisFormValues) => {
    setLoading(true);
    const result = devisId
      ? await updateDevisAction(devisId, values)
      : await createDevisAction(values);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(devisId ? "Devis mis à jour." : "Devis créé.");
    if (!devisId && result.ok && result.data) {
      router.push(`/devis/${result.data.id}`);
    } else {
      router.push("/devis");
    }
  }, [devisId, router]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Header info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Titre du devis *</Label>
          <Input id="title" placeholder="ex: Mission complète Villa Anfa" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Client *</Label>
          <Select
            value={watchClientId}
            onValueChange={(v) => {
              form.setValue("clientId", v ?? "");
              form.setValue("projectId", undefined);
            }}
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
          {form.formState.errors.clientId && (
            <p className="text-xs text-destructive">{form.formState.errors.clientId.message}</p>
          )}
        </div>

        {clientProjects.length > 0 && (
          <div className="space-y-1.5">
            <Label>Projet (optionnel)</Label>
            <Select
              value={watchProjectId ?? "none"}
              onValueChange={(v) => form.setValue("projectId", !v || v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lier à un projet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {clientProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="validUntil">Valable jusqu'au</Label>
          <Input id="validUntil" type="date" {...form.register("validUntil")} />
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Lignes du devis</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => append(newItem())}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
          </Button>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_80px_100px_120px_40px] gap-2 text-xs text-muted-foreground font-medium px-2 mb-1">
          <span>Description</span>
          <span>Qté</span>
          <span>Unité</span>
          <span className="text-right">Prix HT</span>
          <span />
        </div>

        <div className="space-y-2">
          {fields.map((field, idx) => {
            const itemTotal = Math.round(
              (watchItems[idx]?.quantity ?? 0) * (watchItems[idx]?.unitPriceCentimes ?? 0)
            );
            return (
              <div
                key={field.id}
                className="grid grid-cols-2 sm:grid-cols-[1fr_80px_100px_120px_40px] gap-2 items-start bg-gray-50 rounded-lg p-2 border"
              >
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    placeholder="Description de la prestation"
                    {...form.register(`items.${idx}.description`)}
                    className="bg-white"
                  />
                  {form.formState.errors.items?.[idx]?.description && (
                    <p className="text-xs text-destructive mt-0.5">
                      {form.formState.errors.items[idx]?.description?.message}
                    </p>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1"
                  {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                  className="bg-white"
                />
                <Input
                  placeholder="forfait"
                  {...form.register(`items.${idx}.unit`)}
                  className="bg-white"
                />
                <div className="space-y-0.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="bg-white text-right"
                    value={centimesToInput(watchItems[idx]?.unitPriceCentimes ?? 0)}
                    onChange={(e) =>
                      form.setValue(`items.${idx}.unitPriceCentimes`, inputToCentimes(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground text-right px-1">
                    = {formatMAD(itemTotal)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive mt-0.5"
                  onClick={() => remove(idx)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {form.formState.errors.items?.root && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.items.root.message}</p>
        )}
      </div>

      {/* Totals + TVA */}
      <div className="flex flex-col sm:flex-row gap-6 justify-between">
        <div className="space-y-3 max-w-xs">
          <div className="space-y-1.5">
            <Label htmlFor="tvaRate">TVA (%)</Label>
            <Input
              id="tvaRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="w-32"
              {...form.register("tvaRate", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / conditions</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Conditions de paiement, délais, remarques..."
              {...form.register("notes")}
            />
          </div>
        </div>

        <div className="bg-gray-50 border rounded-xl p-4 space-y-2 min-w-[200px] self-start">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total HT</span>
            <span className="font-medium">{formatMAD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">TVA {watchTvaRate}%</span>
            <span className="font-medium">{formatMAD(tva)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
            <span>Total TTC</span>
            <span className="text-primary">{formatMAD(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {devisId ? "Enregistrer les modifications" : "Créer le devis"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
