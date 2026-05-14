"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from "@/lib/actions/templates";
import type { TemplateValues } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, FileText, List, AlignLeft, Edit, Trash2, Copy, Clock } from "lucide-react";
import { formatRelative } from "@/lib/format";

type Template = { id: string; type: string; name: string; description: string | null; content: Record<string, unknown>; created_at: string; updated_at: string };

const DEFAULT_DEVIS_ITEMS = [
  { description: "Honoraires — Phase Esquisse", quantity: 1, unit: "forfait", unitPrice: 0 },
  { description: "Honoraires — Phase APS/APD", quantity: 1, unit: "forfait", unitPrice: 0 },
  { description: "Honoraires — Direction des travaux", quantity: 1, unit: "forfait", unitPrice: 0 },
];

const DEFAULT_CLAUSES = [
  "L'architecte s'engage à respecter les règles de l'art et les normes en vigueur au Maroc.",
  "Les honoraires sont payables à 30% à la signature, 40% au dépôt PC, 30% à la réception.",
  "Tout travail supplémentaire non prévu au présent contrat fera l'objet d'un avenant.",
];

interface Props { initialTemplates: Template[] }

export function TemplatesPage({ initialTemplates }: Props) {
  const t = useTranslations("common");
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TemplateValues>({ type: "devis", name: "", content: {} });
  const [devisItems, setDevisItems] = useState<Array<{ description: string; quantity: number; unit: string; unitPrice: number }>>(DEFAULT_DEVIS_ITEMS);
  const [clauses, setClauses] = useState<string[]>(DEFAULT_CLAUSES);
  const [checklistItems, setChecklistItems] = useState<string[]>([""]);

  const devisTemplates = templates.filter((t) => t.type === "devis");
  const contractTemplates = templates.filter((t) => t.type === "contract_clause");
  const checklistTemplates = templates.filter((t) => t.type === "checklist");

  function openNew(type: TemplateValues["type"] = "devis") {
    setEditing(null);
    setForm({ type, name: "", description: "", content: {} });
    setDevisItems(DEFAULT_DEVIS_ITEMS);
    setClauses(DEFAULT_CLAUSES);
    setChecklistItems([""]);
    setOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    const type = t.type as TemplateValues["type"];
    setForm({ type, name: t.name, description: t.description ?? "", content: t.content });
    if (type === "devis") setDevisItems((t.content.items as typeof DEFAULT_DEVIS_ITEMS) ?? DEFAULT_DEVIS_ITEMS);
    else if (type === "contract_clause") setClauses((t.content.clauses as string[]) ?? DEFAULT_CLAUSES);
    else setChecklistItems((t.content.items as string[]) ?? [""]);
    setOpen(true);
  }

  function buildContent() {
    if (form.type === "devis") return { items: devisItems };
    if (form.type === "contract_clause") return { clauses };
    return { items: checklistItems.filter(Boolean) };
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error("Nom requis."); return; }
    setSaving(true);
    const values: TemplateValues = { ...form, content: buildContent() };
    if (editing) {
      const r = await updateTemplateAction(editing.id, values);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      setTemplates((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...values, description: values.description ?? null, updated_at: new Date().toISOString() } : t));
      toast.success("Modèle mis à jour.");
    } else {
      const r = await createTemplateAction(values);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      router.refresh();
      toast.success("Modèle créé.");
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(id: string) {
    setTemplates((p) => p.filter((t) => t.id !== id));
    await deleteTemplateAction(id);
    toast.success("Modèle supprimé.");
  }

  function handleDuplicate(t: Template) {
    setEditing(null);
    const type = t.type as TemplateValues["type"];
    setForm({ type, name: `${t.name} (copie)`, description: t.description ?? "", content: t.content });
    if (type === "devis") setDevisItems((t.content.items as typeof DEFAULT_DEVIS_ITEMS) ?? []);
    else if (type === "contract_clause") setClauses((t.content.clauses as string[]) ?? []);
    else setChecklistItems((t.content.items as string[]) ?? [""]);
    setOpen(true);
  }

  function TemplateCard({ t }: { t: Template }) {
    return (
      <div className="bg-white border border-[#E8E6DF] rounded-xl p-4 space-y-2 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-[#16170E] text-sm">{t.name}</p>
            {t.description && <p className="text-xs text-[#82806F] mt-0.5">{t.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => handleDuplicate(t)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#F2F2EE]" title="Dupliquer"><Copy className="h-3.5 w-3.5 text-[#82806F]" /></button>
            <button onClick={() => openEdit(t)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#F2F2EE]"><Edit className="h-3.5 w-3.5 text-[#82806F]" /></button>
            <button onClick={() => handleDelete(t.id)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
          </div>
        </div>
        {t.type === "devis" && (
          <p className="text-xs text-[#82806F]">{(t.content.items as unknown[])?.length ?? 0} lignes</p>
        )}
        {t.type === "contract_clause" && (
          <p className="text-xs text-[#82806F]">{(t.content.clauses as unknown[])?.length ?? 0} clause{(t.content.clauses as unknown[])?.length > 1 ? "s" : ""}</p>
        )}
        {t.type === "checklist" && (
          <p className="text-xs text-[#82806F]">{(t.content.items as unknown[])?.length ?? 0} éléments</p>
        )}
        <div className="flex items-center gap-1 text-[10px] text-[#ADAB9D]">
          <Clock className="h-2.5 w-2.5" />
          Modifié {formatRelative(t.updated_at)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="devis">
        <TabsList className="h-9 bg-[#F2F2EE] border border-[#E8E6DF] p-0.5 rounded-lg">
          <TabsTrigger value="devis" className="gap-1.5 text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#16170E] text-[#82806F]">
            <FileText className="h-3.5 w-3.5" />Devis ({devisTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="clauses" className="gap-1.5 text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#16170E] text-[#82806F]">
            <AlignLeft className="h-3.5 w-3.5" />Clauses ({contractTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="checklists" className="gap-1.5 text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#16170E] text-[#82806F]">
            <List className="h-3.5 w-3.5" />Checklists ({checklistTemplates.length})
          </TabsTrigger>
        </TabsList>

        {[
          { value: "devis", items: devisTemplates, type: "devis" as const, label: "Nouveau modèle devis" },
          { value: "clauses", items: contractTemplates, type: "contract_clause" as const, label: "Nouvelle clause" },
          { value: "checklists", items: checklistTemplates, type: "checklist" as const, label: "Nouvelle checklist" },
        ].map(({ value, items, type, label }) => (
          <TabsContent key={value} value={value} className="mt-4 space-y-3">
            <Button onClick={() => openNew(type)}><Plus className="h-4 w-4 mr-2" />{label}</Button>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => <TemplateCard key={t.id} t={t} />)}
            </div>
            {items.length === 0 && (
              <div className="text-center py-12 text-sm text-[#82806F]">
                <p>Aucun modèle. Créez votre premier pour gagner du temps sur chaque projet.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TemplateValues["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devis">Modèle devis</SelectItem>
                    <SelectItem value="contract_clause">Clause contractuelle</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex : Villa standard" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Usage typique…" />
            </div>

            {/* Devis items */}
            {form.type === "devis" && (
              <div className="space-y-2">
                <Label>Lignes du devis</Label>
                {devisItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_80px_80px_24px] gap-1 items-center">
                    <Input value={item.description} onChange={(e) => setDevisItems((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Désignation" className="text-xs" />
                    <Input type="number" value={item.quantity || ""} onChange={(e) => setDevisItems((p) => p.map((x, j) => j === i ? { ...x, quantity: parseFloat(e.target.value) || 0 } : x))} placeholder="Qté" className="text-xs" />
                    <Input value={item.unit} onChange={(e) => setDevisItems((p) => p.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} placeholder="u" className="text-xs" />
                    <Input type="number" value={item.unitPrice || ""} onChange={(e) => setDevisItems((p) => p.map((x, j) => j === i ? { ...x, unitPrice: parseFloat(e.target.value) || 0 } : x))} placeholder="PU" className="text-xs" />
                    <button onClick={() => setDevisItems((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDevisItems((p) => [...p, { description: "", quantity: 1, unit: "forfait", unitPrice: 0 }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Ajouter une ligne
                </Button>
              </div>
            )}

            {/* Contract clauses */}
            {form.type === "contract_clause" && (
              <div className="space-y-2">
                <Label>Clauses</Label>
                {clauses.map((c, i) => (
                  <div key={i} className="flex gap-1">
                    <Textarea value={c} onChange={(e) => setClauses((p) => p.map((x, j) => j === i ? e.target.value : x))} rows={2} className="text-xs flex-1" />
                    <button onClick={() => setClauses((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-1">×</button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setClauses((p) => [...p, ""])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Ajouter une clause
                </Button>
              </div>
            )}

            {/* Checklist items */}
            {form.type === "checklist" && (
              <div className="space-y-2">
                <Label>Éléments</Label>
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <span className="text-xs text-[#82806F] w-5 text-right shrink-0">{i + 1}.</span>
                    <Input value={item} onChange={(e) => setChecklistItems((p) => p.map((x, j) => j === i ? e.target.value : x))} className="text-xs" />
                    <button onClick={() => setChecklistItems((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-1">×</button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setChecklistItems((p) => [...p, ""])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />{t("addItem")}
                </Button>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "…" : editing ? t("save") : t("create")}</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
