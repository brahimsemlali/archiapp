"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatMAD, formatDate } from "@/lib/format";
import { createRecurringInvoiceAction, toggleRecurringInvoiceAction, deleteRecurringInvoiceAction, generateFromRecurringAction } from "@/lib/actions/recurring-invoices";
import type { RecurringInvoiceRow, RecurringInvoiceValues } from "@/lib/actions/recurring-invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RefreshCw, Pause, Play, Trash2, ChevronDown, ChevronUp, Loader2, Zap } from "lucide-react";

const FREQ_LABELS: Record<string, string> = { monthly: "Mensuelle", quarterly: "Trimestrielle", yearly: "Annuelle" };

interface Props {
  initialRecurring: RecurringInvoiceRow[];
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; title: string }>;
}

export function RecurringInvoicesPanel({ initialRecurring, clients }: Props) {
  const t = useTranslations("common");
  const router = useRouter();
  const [recurringSnapshot, setRecurringSnapshot] = useState({
    source: initialRecurring,
    recurring: initialRecurring,
  });
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringInvoiceValues>({
    title: "", items: [{ description: "", quantity: 1, unitPrice: 0, tvaRate: 20 }],
    subtotalCentimes: 0, tvaRate: 20, tvaCentimes: 0, totalCentimes: 0,
    frequency: "monthly", nextDate: new Date().toISOString().split("T")[0]!, autoSend: false,
  });

  if (recurringSnapshot.source !== initialRecurring) {
    setRecurringSnapshot({ source: initialRecurring, recurring: initialRecurring });
  }

  const recurring = recurringSnapshot.recurring;
  const setRecurring = (update: RecurringInvoiceRow[] | ((currentRecurring: RecurringInvoiceRow[]) => RecurringInvoiceRow[])) => {
    setRecurringSnapshot((current) => ({
      source: current.source,
      recurring: typeof update === "function" ? update(current.recurring) : update,
    }));
  };

  function updateItem(i: number, field: string, value: string | number) {
    setForm((f) => {
      const items = f.items.map((item, j) => j === i ? { ...item, [field]: value } : item);
      const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const tva = subtotal * 0.20;
      return { ...f, items, subtotalCentimes: Math.round(subtotal * 100), tvaCentimes: Math.round(tva * 100), totalCentimes: Math.round((subtotal + tva) * 100) };
    });
  }

  async function handleSave() {
    if (!form.title?.trim()) { toast.error("Titre requis."); return; }
    setSaving(true);
    const r = await createRecurringInvoiceAction(form);
    if (!r.ok) { toast.error(r.error); setSaving(false); return; }
    toast.success("Modèle récurrent créé.");
    setRecurring((current) => [r.data, ...current].sort((a, b) => a.next_date.localeCompare(b.next_date)));
    setSaving(false);
    setOpen(false);
  }

  async function handleToggle(id: string, active: boolean) {
    setRecurring((p) => p.map((r) => r.id === id ? { ...r, active: !active } : r));
    const result = await toggleRecurringInvoiceAction(id, !active);
    if (!result.ok) {
      setRecurring((p) => p.map((r) => r.id === id ? { ...r, active } : r));
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    const previous = recurring;
    setRecurring((p) => p.filter((r) => r.id !== id));
    const result = await deleteRecurringInvoiceAction(id);
    if (!result.ok) {
      setRecurring(previous);
      toast.error(result.error);
      return;
    }
    toast.success("Modèle supprimé.");
  }

  async function handleGenerate(id: string) {
    setGenerating(id);
    const r = await generateFromRecurringAction(id);
    setGenerating(null);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Facture créée en brouillon.");
    router.push(`/factures/${r.data.factureId}`);
  }

  if (recurring.length === 0 && !expanded) {
    return (
      <div className="border border-dashed border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="h-4 w-4 text-[#ADAB9D]" />
          <div>
            <p className="text-sm font-medium text-[#0B1220]">Facturation récurrente</p>
            <p className="text-xs text-[#64748B]">Automatisez vos factures mensuelles ou trimestrielles.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setExpanded(true); setOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Configurer
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F1F5F9] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <RefreshCw className="h-4 w-4 text-[#64748B]" />
          <p className="text-sm font-semibold text-[#0B1220]">Facturation récurrente</p>
          <Badge variant="outline" className="text-[10px]">{recurring.length} modèle{recurring.length > 1 ? "s" : ""}</Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-[#64748B]" /> : <ChevronDown className="h-4 w-4 text-[#64748B]" />}
      </button>

      {expanded && (
        <div className="border-t border-[#E5E7EB] divide-y divide-[#F1F5F9]">
          {recurring.map((r) => (
            <div key={r.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${!r.active ? "opacity-50" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0B1220] truncate">{r.title}</p>
                <p className="text-xs text-[#64748B]">
                  {r.clients?.name ?? ""}{r.projects?.title ? ` · ${r.projects.title}` : ""}
                  {" · "}{FREQ_LABELS[r.frequency] ?? r.frequency}
                  {" · Prochaine : "}{formatDate(r.next_date)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-sm">{formatMAD(r.total_centimes)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 px-2"
                  onClick={() => handleGenerate(r.id)}
                  disabled={generating === r.id}
                >
                  {generating === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                  Générer
                </Button>
                <button onClick={() => handleToggle(r.id, r.active)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#F1F5F9]">
                  {r.active ? <Pause className="h-3.5 w-3.5 text-[#64748B]" /> : <Play className="h-3.5 w-3.5 text-[#64748B]" />}
                </button>
                <button onClick={() => handleDelete(r.id)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 py-3">
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Nouveau modèle
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle facture récurrente</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex : Honoraires suivi mensuel" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={form.clientId ?? "none"} onValueChange={(v) => v && setForm((f) => ({ ...f, clientId: v === "none" ? undefined : v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Aucun</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fréquence</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as RecurringInvoiceValues["frequency"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                    <SelectItem value="quarterly">Trimestrielle</SelectItem>
                    <SelectItem value="yearly">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Première génération</Label><Input type="date" value={form.nextDate} onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Lignes</Label>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_80px_24px] gap-1 items-center">
                  <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Désignation" className="text-xs" />
                  <Input type="number" value={item.quantity || ""} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qté" className="text-xs" />
                  <Input type="number" value={item.unitPrice || ""} onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} placeholder="PU (MAD)" className="text-xs" />
                  <button onClick={() => setForm((f) => { const items = f.items.filter((_, j) => j !== i); const sub = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0); return { ...f, items, subtotalCentimes: Math.round(sub * 100), tvaCentimes: Math.round(sub * 0.20 * 100), totalCentimes: Math.round(sub * 1.20 * 100) }; })} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, unitPrice: 0, tvaRate: 20 }] }))}>
                <Plus className="h-3.5 w-3.5 mr-1" />Ligne
              </Button>
            </div>
            {form.totalCentimes > 0 && (
              <div className="bg-[#F1F5F9] rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-[#64748B]">Sous-total HT</span><span>{formatMAD(form.subtotalCentimes)}</span></div>
                <div className="flex justify-between"><span className="text-[#64748B]">TVA 20%</span><span>{formatMAD(form.tvaCentimes)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total TTC</span><span>{formatMAD(form.totalCentimes)}</span></div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "…" : t("create")}</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
