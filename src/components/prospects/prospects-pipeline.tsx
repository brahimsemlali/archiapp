"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalization } from "@/components/localization-provider";
import { createProspectAction, updateProspectAction, deleteProspectAction } from "@/lib/actions/prospects";
import type { ProspectRow, ProspectValues } from "@/lib/actions/prospects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarClock,
  Copy,
  DollarSign,
  Edit,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Percent,
  Phone,
  Plus,
  Send,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STAGES = [
  { key: "nouveau", label: "Nouveau", color: "bg-blue-100 text-blue-800", probability: 0.1 },
  { key: "rdv", label: "RDV planifié", color: "bg-purple-100 text-purple-800", probability: 0.25 },
  { key: "proposition", label: "Proposition envoyée", color: "bg-amber-100 text-amber-800", probability: 0.55 },
  { key: "negociation", label: "Négociation", color: "bg-orange-100 text-orange-800", probability: 0.75 },
  { key: "gagne", label: "Gagné", color: "bg-green-100 text-green-800", probability: 1 },
  { key: "perdu", label: "Perdu", color: "bg-red-100 text-red-800", probability: 0 },
] as const;

const FOLLOW_UP_STATUSES = [
  { value: "none", label: "Non suivi", color: "bg-[#F1F5F9] text-[#64748B]" },
  { value: "to_follow_up", label: "À relancer", color: "bg-amber-50 text-amber-700" },
  { value: "sent", label: "Message envoyé", color: "bg-blue-50 text-blue-700" },
  { value: "waiting_reply", label: "Réponse attendue", color: "bg-purple-50 text-purple-700" },
  { value: "closed", label: "Clos", color: "bg-green-50 text-green-700" },
] as const;

const SOURCES = [
  { value: "referral", label: "Recommandation" },
  { value: "portfolio", label: "Portfolio web" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "cold", label: "Démarchage" },
  { value: "other", label: "Autre" },
];

type Prospect = ProspectRow;

interface Props { initialProspects: ProspectRow[] }

function stageProbability(stage: string): number {
  return STAGES.find((s) => s.key === stage)?.probability ?? 0;
}

function followUpMeta(status: string) {
  return FOLLOW_UP_STATUSES.find((s) => s.value === status) ?? FOLLOW_UP_STATUSES[0];
}

function cleanWhatsAppNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  if (digits.length === 9 && /^[67]/.test(digits)) return `212${digits}`;
  return digits;
}

function prospectMessage(p: Prospect): string {
  const project = p.project_type ? ` pour ${p.project_type}` : "";
  return `Bonjour ${p.contact_name ?? ""}, je vous contacte au sujet de ${p.name}${project}. Souhaitez-vous que l'on planifie la prochaine étape ?`;
}

export function ProspectsPipeline({ initialProspects }: Props) {
  const { money } = useLocalization();
  const t = useTranslations("common");
  const [prospectSnapshot, setProspectSnapshot] = useState({
    source: initialProspects,
    prospects: initialProspects,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProspectValues>({ name: "", stage: "nouveau" });

  if (prospectSnapshot.source !== initialProspects) {
    setProspectSnapshot({ source: initialProspects, prospects: initialProspects });
  }

  const prospects = prospectSnapshot.prospects;
  const setProspects = (update: Prospect[] | ((currentProspects: Prospect[]) => Prospect[])) => {
    setProspectSnapshot((current) => ({
      source: current.source,
      prospects: typeof update === "function" ? update(current.prospects) : update,
    }));
  };

  const totalPipeline = prospects.filter((p) => !["gagne", "perdu"].includes(p.stage))
    .reduce((s, p) => s + p.estimated_value_centimes, 0);
  const weightedPipeline = prospects.filter((p) => p.stage !== "perdu")
    .reduce((s, p) => s + Math.round(p.estimated_value_centimes * stageProbability(p.stage)), 0);
  const totalGagne = prospects.filter((p) => p.stage === "gagne").reduce((s, p) => s + p.estimated_value_centimes, 0);
  const today = new Date().toISOString().slice(0, 10);
  const followUpsDue = prospects.filter((p) =>
    p.next_follow_up_date && p.next_follow_up_date <= today && !["gagne", "perdu"].includes(p.stage)
  ).length;

  function openNew(stage = "nouveau") {
    setEditing(null);
    setForm({ name: "", stage });
    setOpen(true);
  }

  function openEdit(p: Prospect) {
    setEditing(p);
    setForm({
      name: p.name, contactName: p.contact_name ?? "", phone: p.phone ?? "",
      whatsappNumber: p.whatsapp_number ?? p.phone ?? "",
      email: p.email ?? "", source: p.source ?? "", type: p.type,
      stage: p.stage, estimatedValueCentimes: p.estimated_value_centimes,
      projectType: p.project_type ?? "", notes: p.notes ?? "",
      followUpStatus: p.follow_up_status,
      nextFollowUpDate: p.next_follow_up_date ?? "",
      communicationNotes: p.communication_notes ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error("Nom requis."); return; }
    setSaving(true);
    if (editing) {
      const r = await updateProspectAction(editing.id, form);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      setProspects((prev) => prev.map((p) => p.id === editing.id ? {
        ...p,
        name: form.name ?? p.name,
        contact_name: form.contactName ?? null,
        phone: form.phone ?? null,
        whatsapp_number: form.whatsappNumber ?? null,
        email: form.email ?? null,
        source: form.source ?? null,
        type: form.type ?? p.type,
        stage: form.stage ?? p.stage,
        project_type: form.projectType ?? null,
        estimated_value_centimes: form.estimatedValueCentimes ?? 0,
        notes: form.notes ?? null,
        lost_reason: form.lostReason ?? null,
        follow_up_status: form.followUpStatus ?? p.follow_up_status,
        next_follow_up_date: form.nextFollowUpDate || null,
        communication_notes: form.communicationNotes ?? null,
      } : p));
      toast.success("Prospect mis à jour.");
    } else {
      const r = await createProspectAction(form);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      setProspects((prev) => [r.data, ...prev]);
      toast.success("Prospect créé.");
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

  async function handleWhatsApp(p: Prospect) {
    const number = cleanWhatsAppNumber(p.whatsapp_number ?? p.phone);
    if (!number) { toast.error("Ajoutez un numéro WhatsApp."); return; }
    const message = prospectMessage(p);
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    const contactedAt = new Date().toISOString();
    setProspects((prev) => prev.map((item) =>
      item.id === p.id ? { ...item, follow_up_status: "waiting_reply", last_contacted_at: contactedAt } : item
    ));
    const result = await updateProspectAction(p.id, {
      followUpStatus: "waiting_reply",
      lastContactedAt: contactedAt,
      communicationNotes: p.communication_notes || message,
    });
    if (!result.ok) toast.error(result.error);
  }

  async function handleCopyMessage(p: Prospect) {
    await navigator.clipboard.writeText(prospectMessage(p));
    toast.success("Message copié.");
  }

  return (
    <div className="space-y-5">
      {/* KPI bar */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-3.5 w-3.5 text-[#64748B]" />
            <p className="text-xs text-[#64748B]">Prospects actifs</p>
          </div>
          <p className="text-2xl font-bold text-[#0B1220]">{prospects.filter((p) => !["gagne", "perdu"].includes(p.stage)).length}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-[#64748B]" />
            <p className="text-xs text-[#64748B]">Pipeline total</p>
          </div>
          <p className="text-lg font-bold text-[#0B1220]">{totalPipeline > 0 ? money(totalPipeline) : "—"}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="h-3.5 w-3.5 text-[#2F8F5C]" />
            <p className="text-xs text-[#64748B]">Prévision pondérée</p>
          </div>
          <p className="text-lg font-bold text-[#0B1220]">{weightedPipeline > 0 ? money(weightedPipeline) : "—"}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-[#64748B]">Gagné</p>
          </div>
          <p className="text-lg font-bold text-green-700">{totalGagne > 0 ? money(totalGagne) : "—"}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
            <p className="text-xs text-[#64748B]">Relances dues</p>
          </div>
          <p className={`text-lg font-bold ${followUpsDue > 0 ? "text-amber-700" : "text-[#0B1220]"}`}>{followUpsDue}</p>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const stageProspects = prospects.filter((p) => p.stage === stage.key);
          const stageWeighted = stageProspects.reduce((sum, p) => sum + Math.round(p.estimated_value_centimes * stage.probability), 0);
          return (
            <div key={stage.key} className="flex-shrink-0 w-64 bg-[#F1F5F9] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.label}</span>
                  <span className="text-[11px] text-[#64748B]">{stageProspects.length}</span>
                </div>
                {stage.key !== "gagne" && stage.key !== "perdu" && (
                  <button onClick={() => openNew(stage.key)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-[#E5E7EB] text-[#64748B]">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                <span>Prob. {Math.round(stage.probability * 100)}%</span>
                <span>{stageWeighted > 0 ? money(stageWeighted) : "—"}</span>
              </div>
              <div className="space-y-2">
                {stageProspects.map((p) => {
                  const followUp = followUpMeta(p.follow_up_status);
                  const isFollowUpDue = p.next_follow_up_date && p.next_follow_up_date <= today && !["gagne", "perdu"].includes(p.stage);
                  return (
                  <div key={p.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3 space-y-1.5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[13px] font-semibold text-[#0B1220] leading-snug">{p.name}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-5 w-5 flex items-center justify-center rounded hover:bg-[#F1F5F9] text-[#64748B] shrink-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5 mr-2" />Modifier</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleWhatsApp(p)}><Send className="h-3.5 w-3.5 mr-2" />Message WhatsApp</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyMessage(p)}><Copy className="h-3.5 w-3.5 mr-2" />Copier modèle</DropdownMenuItem>
                          {STAGES.filter((s) => s.key !== p.stage).map((s) => (
                            <DropdownMenuItem key={s.key} onClick={() => handleStageChange(p.id, s.key)}>
                              → {s.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5 mr-2" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {p.contact_name && <p className="text-[11px] text-[#64748B]">{p.contact_name}</p>}
                    {p.project_type && <p className="text-[11px] text-[#64748B] italic">{p.project_type}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#0B1220]">
                          <Phone className="h-2.5 w-2.5" />{p.phone}
                        </a>
                      )}
                      {p.email && (
                        <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#0B1220]">
                          <Mail className="h-2.5 w-2.5" />{p.email}
                        </a>
                      )}
                      {(p.whatsapp_number || p.phone) && (
                        <button onClick={() => handleWhatsApp(p)} className="flex items-center gap-1 text-[10px] text-[#2F8F5C] hover:text-[#0B1220]">
                          <MessageCircle className="h-2.5 w-2.5" />WhatsApp
                        </button>
                      )}
                    </div>
                    {p.estimated_value_centimes > 0 && (
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#0B1220]">
                        <span>{money(p.estimated_value_centimes)}</span>
                        {stage.probability > 0 && stage.probability < 1 && (
                          <span className="text-[#64748B]">{money(Math.round(p.estimated_value_centimes * stage.probability))}</span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {p.source && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{SOURCES.find((s) => s.value === p.source)?.label ?? p.source}</Badge>
                      )}
                      {p.follow_up_status !== "none" && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${followUp.color}`}>{followUp.label}</span>
                      )}
                      {isFollowUpDue && (
                        <span className="rounded-full bg-[#FCEFE6] px-1.5 py-0.5 text-[9px] font-semibold text-[#C75B2E]">Relance due</span>
                      )}
                    </div>
                  </div>
                );
                })}
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
                <Label>WhatsApp</Label>
                <Input value={form.whatsappNumber ?? ""} onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))} placeholder="+212 6..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source ?? "other"} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valeur estimée (MAD)</Label>
                <Input
                  type="number"
                  value={form.estimatedValueCentimes ? form.estimatedValueCentimes / 100 : ""}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedValueCentimes: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prochaine relance</Label>
                <Input
                  type="date"
                  value={form.nextFollowUpDate ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type de projet</Label>
              <Input value={form.projectType ?? ""} onChange={(e) => setForm((f) => ({ ...f, projectType: e.target.value }))} placeholder="Ex : Villa R+1, 400 m²" />
            </div>
            <div className="space-y-1.5">
              <Label>Suivi commercial</Label>
              <Select value={form.followUpStatus ?? "none"} onValueChange={(v) => setForm((f) => ({ ...f, followUpStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FOLLOW_UP_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Message / relance client</Label>
              <Textarea value={form.communicationNotes ?? ""} onChange={(e) => setForm((f) => ({ ...f, communicationNotes: e.target.value }))} rows={2} placeholder="Dernier message envoyé, objection, prochaine action..." />
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
