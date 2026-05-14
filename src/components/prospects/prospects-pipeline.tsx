"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatMAD } from "@/lib/format";
import { createProspectAction, updateProspectAction, deleteProspectAction } from "@/lib/actions/prospects";
import type { ProspectValues } from "@/lib/actions/prospects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Phone, Mail, MoreHorizontal, Trash2, Edit, TrendingUp, Users, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STAGES = [
  { key: "nouveau", label: "Nouveau", color: "bg-blue-100 text-blue-800" },
  { key: "rdv", label: "RDV planifié", color: "bg-purple-100 text-purple-800" },
  { key: "proposition", label: "Proposition envoyée", color: "bg-amber-100 text-amber-800" },
  { key: "negociation", label: "Négociation", color: "bg-orange-100 text-orange-800" },
  { key: "gagne", label: "Gagné", color: "bg-green-100 text-green-800" },
  { key: "perdu", label: "Perdu", color: "bg-red-100 text-red-800" },
] as const;

const SOURCES = [
  { value: "referral", label: "Recommandation" },
  { value: "portfolio", label: "Portfolio web" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "cold", label: "Démarchage" },
  { value: "other", label: "Autre" },
];

type Prospect = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  type: string;
  stage: string;
  estimated_value_centimes: number;
  project_type: string | null;
  notes: string | null;
  lost_reason: string | null;
  created_at: string;
};

interface Props { initialProspects: Prospect[] }

export function ProspectsPipeline({ initialProspects }: Props) {
  const t = useTranslations("common");
  const router = useRouter();
  const [prospects, setProspects] = useState(initialProspects);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProspectValues>({ name: "", stage: "nouveau" });

  const totalPipeline = prospects.filter((p) => !["gagne", "perdu"].includes(p.stage))
    .reduce((s, p) => s + p.estimated_value_centimes, 0);
  const totalGagne = prospects.filter((p) => p.stage === "gagne").reduce((s, p) => s + p.estimated_value_centimes, 0);

  function openNew(stage = "nouveau") {
    setEditing(null);
    setForm({ name: "", stage });
    setOpen(true);
  }

  function openEdit(p: Prospect) {
    setEditing(p);
    setForm({
      name: p.name, contactName: p.contact_name ?? "", phone: p.phone ?? "",
      email: p.email ?? "", source: p.source ?? "", type: p.type,
      stage: p.stage, estimatedValueCentimes: p.estimated_value_centimes,
      projectType: p.project_type ?? "", notes: p.notes ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error("Nom requis."); return; }
    setSaving(true);
    if (editing) {
      const r = await updateProspectAction(editing.id, form);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      setProspects((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...form, contact_name: form.contactName ?? null, phone: form.phone ?? null, email: form.email ?? null, source: form.source ?? null, project_type: form.projectType ?? null, estimated_value_centimes: form.estimatedValueCentimes ?? 0, notes: form.notes ?? null, lost_reason: form.lostReason ?? null } : p));
      toast.success("Prospect mis à jour.");
    } else {
      const r = await createProspectAction(form);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      router.refresh();
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleStageChange(id: string, stage: string) {
    const previous = prospects;
    setProspects((prev) => prev.map((p) => p.id === id ? { ...p, stage } : p));
    const result = await updateProspectAction(id, { stage });
    if (!result.ok) {
      setProspects(previous);
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    const previous = prospects;
    setProspects((prev) => prev.filter((p) => p.id !== id));
    const result = await deleteProspectAction(id);
    if (!result.ok) {
      setProspects(previous);
      toast.error(result.error);
      return;
    }
    toast.success("Prospect supprimé.");
  }

  return (
    <div className="space-y-5">
      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#E8E6DF] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-3.5 w-3.5 text-[#82806F]" />
            <p className="text-xs text-[#82806F]">Prospects actifs</p>
          </div>
          <p className="text-2xl font-bold text-[#16170E]">{prospects.filter((p) => !["gagne", "perdu"].includes(p.stage)).length}</p>
        </div>
        <div className="bg-white border border-[#E8E6DF] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-[#82806F]" />
            <p className="text-xs text-[#82806F]">Pipeline total</p>
          </div>
          <p className="text-lg font-bold text-[#16170E]">{totalPipeline > 0 ? formatMAD(totalPipeline) : "—"}</p>
        </div>
        <div className="bg-white border border-[#E8E6DF] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-[#82806F]">Gagné</p>
          </div>
          <p className="text-lg font-bold text-green-700">{totalGagne > 0 ? formatMAD(totalGagne) : "—"}</p>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const stageProspects = prospects.filter((p) => p.stage === stage.key);
          return (
            <div key={stage.key} className="flex-shrink-0 w-64 bg-[#F2F2EE] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.label}</span>
                  <span className="text-[11px] text-[#82806F]">{stageProspects.length}</span>
                </div>
                {stage.key !== "gagne" && stage.key !== "perdu" && (
                  <button onClick={() => openNew(stage.key)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-[#E8E6DF] text-[#82806F]">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {stageProspects.map((p) => (
                  <div key={p.id} className="bg-white border border-[#E8E6DF] rounded-lg p-3 space-y-1.5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[13px] font-semibold text-[#16170E] leading-snug">{p.name}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-5 w-5 flex items-center justify-center rounded hover:bg-[#F2F2EE] text-[#82806F] shrink-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5 mr-2" />Modifier</DropdownMenuItem>
                          {STAGES.filter((s) => s.key !== p.stage).map((s) => (
                            <DropdownMenuItem key={s.key} onClick={() => handleStageChange(p.id, s.key)}>
                              → {s.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5 mr-2" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {p.contact_name && <p className="text-[11px] text-[#82806F]">{p.contact_name}</p>}
                    {p.project_type && <p className="text-[11px] text-[#82806F] italic">{p.project_type}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-[10px] text-[#82806F] hover:text-[#16170E]">
                          <Phone className="h-2.5 w-2.5" />{p.phone}
                        </a>
                      )}
                      {p.email && (
                        <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-[10px] text-[#82806F] hover:text-[#16170E]">
                          <Mail className="h-2.5 w-2.5" />{p.email}
                        </a>
                      )}
                    </div>
                    {p.estimated_value_centimes > 0 && (
                      <p className="text-[11px] font-semibold text-[#16170E]">{formatMAD(p.estimated_value_centimes)}</p>
                    )}
                    {p.source && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{SOURCES.find((s) => s.value === p.source)?.label ?? p.source}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={() => openNew()} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2" />
        Nouveau prospect
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le prospect" : "Nouveau prospect"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Nom du projet ou client *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex : Villa Agdal — M. Benali" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact</Label>
                <Input value={form.contactName ?? ""} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Prénom Nom" />
              </div>
              <div className="space-y-1.5">
                <Label>Stade</Label>
                <Select value={form.stage ?? "nouveau"} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="06 00 00 00 00" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source ?? "other"} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valeur estimée (MAD)</Label>
                <Input
                  type="number"
                  value={form.estimatedValueCentimes ? form.estimatedValueCentimes / 100 : ""}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedValueCentimes: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type de projet</Label>
              <Input value={form.projectType ?? ""} onChange={(e) => setForm((f) => ({ ...f, projectType: e.target.value }))} placeholder="Ex : Villa R+1, 400 m²" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            {form.stage === "perdu" && (
              <div className="space-y-1.5">
                <Label>Raison de la perte</Label>
                <Input value={form.lostReason ?? ""} onChange={(e) => setForm((f) => ({ ...f, lostReason: e.target.value }))} placeholder="Prix, concurrent, budget..." />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? t("saving") : editing ? t("save") : t("create")}</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
