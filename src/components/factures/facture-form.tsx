"use client";

import { useRef, useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { factureFormSchema, type FactureFormValues } from "@/lib/validators/facture";
import { createFactureAction, updateFactureAction } from "@/lib/actions/factures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useLocalization } from "@/components/localization-provider";
import type { DevisItem } from "@/lib/validators/devis";

interface FactureFormProps {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string; client_id: string }[];
  defaultValues?: Partial<FactureFormValues>;
  factureId?: string;
}

function centimesToInput(c: number) { return (c / 100).toFixed(2); }
function inputToCentimes(v: string) { return Math.round(parseFloat(v || "0") * 100); }
function newItem(): DevisItem {
  return { id: globalThis.crypto.randomUUID(), description: "", quantity: 1, unit: "forfait", unitPriceCentimes: 0 };
}

export function FactureForm({ clients, projects, defaultValues, factureId }: FactureFormProps) {
  const { money, taxLabel } = useLocalization();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const form = useForm<FactureFormValues, unknown, FactureFormValues>({
    resolver: zodResolver(factureFormSchema) as never,
    defaultValues: {
      title: "",
      clientId: "",
      projectId: undefined,
      devisId: undefined,
      items: [newItem()],
      tvaRate: 20,
      notes: "",
      dueDate: "",
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchItems = useWatch({ control: form.control, name: "items" }) ?? [];
  const watchTvaRate = useWatch({ control: form.control, name: "tvaRate" });
  const watchClientId = useWatch({ control: form.control, name: "clientId" });
  const watchProjectId = useWatch({ control: form.control, name: "projectId" });
  const clientProjects = projects.filter((p) => p.client_id === watchClientId);

  const subtotal = watchItems.reduce((s, i) => s + Math.round((i.quantity || 0) * (i.unitPriceCentimes || 0)), 0);
  const tva = Math.round(subtotal * (watchTvaRate || 20) / 100);
  const total = subtotal + tva;

  const onSubmit = useCallback(async (values: FactureFormValues) => {
    if (factureId) {
      const result = await updateFactureAction(factureId, values);
      if (!result.ok) {
        setLoading(false);
        submittingRef.current = false;
        toast.error(result.error);
        return;
      }
      toast.success("Facture mise à jour.");
      router.push(`/factures/${factureId}`);
    } else {
      const result = await createFactureAction(values);
      if (!result.ok) {
        setLoading(false);
        submittingRef.current = false;
        toast.error(result.error);
        return;
      }
      toast.success("Facture créée.");
      if (result.ok && result.data) router.push(`/factures/${result.data.id}`);
    }
  }, [router, factureId]);

  const onInvalid = useCallback(() => {
    setLoading(false);
    submittingRef.current = false;
  }, []);

  const handleFormSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    void form.handleSubmit(onSubmit, onInvalid)(event);
  }, [form, onInvalid, onSubmit]);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Titre *</Label>
          <Input id="title" placeholder="ex: Facture mission complète Villa Anfa" {...form.register("title")} />
          {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Client *</Label>
          <Select value={watchClientId} onValueChange={(v) => { form.setValue("clientId", v ?? ""); form.setValue("projectId", undefined); }}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {clientProjects.length > 0 && (
          <div className="space-y-1.5">
            <Label>Projet (optionnel)</Label>
            <Select value={watchProjectId ?? "none"} onValueChange={(v) => form.setValue("projectId", !v || v === "none" ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Lier à un projet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {clientProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Date d'échéance</Label>
          <Input id="dueDate" type="date" {...form.register("dueDate")} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Lignes de facturation</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => append(newItem())}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
        <div className="hidden sm:grid grid-cols-[1fr_80px_100px_120px_40px] gap-2 text-xs text-muted-foreground font-medium px-2 mb-1">
          <span>Description</span><span>Qté</span><span>Unité</span><span className="text-right">Prix HT</span><span />
        </div>
        <div className="space-y-2">
          {fields.map((field, idx) => {
            const lineTotal = Math.round((watchItems[idx]?.quantity ?? 0) * (watchItems[idx]?.unitPriceCentimes ?? 0));
            return (
              <div key={field.id} className="grid grid-cols-2 sm:grid-cols-[1fr_80px_100px_120px_40px] gap-2 items-start bg-gray-50 rounded-lg p-2 border">
                <Input placeholder="Description" {...form.register(`items.${idx}.description`)} className="bg-white col-span-2 sm:col-span-1" />
                <Input type="number" step="0.01" min="0" {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })} className="bg-white" />
                <Input placeholder="forfait" {...form.register(`items.${idx}.unit`)} className="bg-white" />
                <div className="space-y-0.5">
                  <Input type="number" step="0.01" min="0" className="bg-white text-right"
                    value={centimesToInput(watchItems[idx]?.unitPriceCentimes ?? 0)}
                    onChange={(e) => form.setValue(`items.${idx}.unitPriceCentimes`, inputToCentimes(e.target.value))} />
                  <p className="text-xs text-muted-foreground text-right px-1">= {money(lineTotal)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive mt-0.5" onClick={() => remove(idx)} disabled={fields.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 justify-between">
        <div className="space-y-3 max-w-xs">
          <div className="space-y-1.5">
            <Label>{taxLabel} (%)</Label>
            <Input type="number" min="0" max="100" step="0.1" className="w-32" {...form.register("tvaRate", { valueAsNumber: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes / conditions de paiement</Label>
            <Textarea rows={3} placeholder="ex: Paiement par virement sous 30 jours" {...form.register("notes")} />
          </div>
        </div>
        <div className="bg-gray-50 border rounded-xl p-4 space-y-2 min-w-[200px] self-start">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total HT</span><span className="font-medium">{money(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{taxLabel} {watchTvaRate}%</span><span className="font-medium">{money(tva)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total TTC</span><span className="text-primary">{money(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer la facture
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
