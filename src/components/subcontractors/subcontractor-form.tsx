"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { createSubcontractorAction, updateSubcontractorAction, type SubcontractorInput } from "@/lib/actions/subcontractors";
import { cn } from "@/lib/utils";

const TRADES = [
  "Gros œuvre", "Maçonnerie", "Béton armé", "Charpente", "Couverture",
  "Plomberie", "Électricité", "CVC", "Menuiserie aluminium", "Menuiserie bois",
  "Carrelage", "Peinture", "Plâtrerie", "Étanchéité", "Serrurerie",
  "Ascenseur", "Paysagisme", "Voirie & réseaux", "Autre",
];

interface SubcontractorFormProps {
  subcontractor?: { id: string } & SubcontractorInput;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubcontractorForm({ subcontractor, onSuccess, onCancel }: SubcontractorFormProps) {
  const t = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(subcontractor?.name ?? "");
  const [trade, setTrade] = useState(subcontractor?.trade ?? "");
  const [phone, setPhone] = useState(subcontractor?.phone ?? "");
  const [email, setEmail] = useState(subcontractor?.email ?? "");
  const [address, setAddress] = useState(subcontractor?.address ?? "");
  const [cnss, setCnss] = useState(subcontractor?.cnss ?? "");
  const [rib, setRib] = useState(subcontractor?.rib ?? "");
  const [rating, setRating] = useState(subcontractor?.rating ?? 0);
  const [notes, setNotes] = useState(subcontractor?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nom requis."); return; }
    setSaving(true);
    const input: SubcontractorInput = {
      name: name.trim(),
      trade: trade || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      cnss: cnss || undefined,
      rib: rib || undefined,
      rating: rating || undefined,
      notes: notes || undefined,
    };
    const result = subcontractor
      ? await updateSubcontractorAction(subcontractor.id, input)
      : await createSubcontractorAction(input);
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success(subcontractor ? "Sous-traitant mis à jour." : "Sous-traitant ajouté.");
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-name">Nom / Entreprise *</Label>
          <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Corps de métier</Label>
          <Select value={trade || "aucun"} onValueChange={(v) => setTrade((v ?? "aucun") === "aucun" ? "" : (v ?? ""))}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="aucun">Aucun</SelectItem>
              {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-phone">Téléphone</Label>
          <Input id="sc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6XX XXX XXX" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-email">Email</Label>
          <Input id="sc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-cnss">CNSS</Label>
          <Input id="sc-cnss" value={cnss} onChange={(e) => setCnss(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-address">Adresse</Label>
          <Input id="sc-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-rib">RIB</Label>
          <Input id="sc-rib" value={rib} onChange={(e) => setRib(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Note de fiabilité</Label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n === rating ? 0 : n)}
              className="rounded-md p-1 text-slate-300 transition-colors hover:bg-amber-50 hover:text-amber-400"
              aria-label={`Noter ${n} sur 5`}
            >
              <Star className={cn("h-5 w-5", n <= rating ? "fill-amber-400 text-amber-400" : "text-current")} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sc-notes">Notes</Label>
        <Textarea id="sc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations, historique…" />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[#E8E6DF] pt-4 sm:flex-row">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {subcontractor ? t("save") : t("add")}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button>}
      </div>
    </form>
  );
}
