"use client";

import { useMemo, useState } from "react";
import { useLocalization } from "@/components/localization-provider";
import type { FormEvent } from "react";
import { CheckCircle2, Loader2, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSiteIssueAction, updateSiteIssueAction } from "@/lib/actions/site-issues";
import { cn } from "@/lib/utils";

export interface SiteIssueRow {
  id: string;
  project_id: string;
  site_visit_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  zone: string | null;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  photo_url: string | null;
  created_at: string;
}

interface Member {
  userId: string;
  role: string;
}

const STATUS_LABELS = {
  open: "Ouverte",
  in_progress: "En cours",
  resolved: "Résolue",
};

const PRIORITY_LABELS = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

export function SiteIssuesPanel({
  projectId,
  issues,
  members,
}: {
  projectId: string;
  issues: SiteIssueRow[];
  members: Member[];
}) {
  const { formatDateShort } = useLocalization();
  const [issueSnapshot, setIssueSnapshot] = useState({ source: issues, items: issues });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    zone: "",
    priority: "medium" as "low" | "medium" | "high",
    assignedTo: "none",
    dueDate: "",
  });

  if (issueSnapshot.source !== issues) {
    setIssueSnapshot({ source: issues, items: issues });
  }

  const items = issueSnapshot.items;
  const setItems = (update: SiteIssueRow[] | ((currentItems: SiteIssueRow[]) => SiteIssueRow[])) => {
    setIssueSnapshot((current) => ({
      source: current.source,
      items: typeof update === "function" ? update(current.items) : update,
    }));
  };

  const counts = useMemo(() => ({
    open: items.filter((i) => i.status === "open").length,
    inProgress: items.filter((i) => i.status === "in_progress").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  }), [items]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createSiteIssueAction({
      projectId,
      title: form.title,
      description: form.description || undefined,
      zone: form.zone || undefined,
      priority: form.priority,
      assignedTo: form.assignedTo === "none" ? undefined : form.assignedTo,
      dueDate: form.dueDate || undefined,
      status: "open",
    });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Réserve ajoutée.");
    setItems((prev) => [{
      id: result.data.id,
      project_id: projectId,
      site_visit_id: null,
      assigned_to: form.assignedTo === "none" ? null : form.assignedTo,
      title: form.title,
      description: form.description || null,
      zone: form.zone || null,
      status: "open",
      priority: form.priority,
      due_date: form.dueDate || null,
      photo_url: null,
      created_at: new Date().toISOString(),
    }, ...prev]);
    setForm({ title: "", description: "", zone: "", priority: "medium", assignedTo: "none", dueDate: "" });
    setShowForm(false);
  }

  async function updateStatus(issue: SiteIssueRow, status: SiteIssueRow["status"]) {
    setItems((prev) => prev.map((i) => i.id === issue.id ? { ...i, status } : i));
    const result = await updateSiteIssueAction(issue.id, { status });
    if (!result.ok) {
      setItems((prev) => prev.map((i) => i.id === issue.id ? issue : i));
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Ouvertes" value={counts.open} className="bg-[#FCEFE6] text-[#C75B2E]" />
        <Summary label="En cours" value={counts.inProgress} className="bg-amber-50 text-amber-700" />
        <Summary label="Résolues" value={counts.resolved} className="bg-[#E5F3EB] text-[#2F8F5C]" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0B1220]">Punch list chantier</p>
          <p className="text-xs text-[#64748B]">Réserves, problèmes de site et actions à assigner.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Input value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as typeof form.priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignée à</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v ?? "none" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assignée</SelectItem>
                  {members.map((m) => <SelectItem key={m.userId} value={m.userId}>{m.userId.slice(0, 8)} · {m.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Échéance</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8D5CB] bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-[#B9DEC8]" />
            <p className="text-sm font-medium text-[#0B1220]">Aucune réserve ouverte</p>
            <p className="mt-1 text-xs text-[#64748B]">Les problèmes de chantier apparaîtront ici.</p>
          </div>
        ) : (
          items.map((issue) => (
            <div key={issue.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      issue.priority === "high" ? "bg-[#FCEFE6] text-[#C75B2E]" :
                      issue.priority === "medium" ? "bg-amber-50 text-amber-700" :
                      "bg-[#F1F5F9] text-[#64748B]"
                    )}>
                      {PRIORITY_LABELS[issue.priority]}
                    </span>
                    <span className="text-[11px] text-[#64748B]">{STATUS_LABELS[issue.status]}</span>
                    {issue.zone && <span className="text-[11px] text-[#ADAB9D]">{issue.zone}</span>}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#0B1220]">{issue.title}</p>
                  {issue.description && <p className="mt-1 text-sm text-[#475569]">{issue.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[#64748B]">
                    {issue.assigned_to && <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{issue.assigned_to.slice(0, 8)}</span>}
                    {issue.due_date && <span>Échéance {formatDateShort(issue.due_date)}</span>}
                    {issue.site_visit_id && <span>Depuis une visite</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant={issue.status === "open" ? "default" : "outline"} onClick={() => updateStatus(issue, "open")}>Ouverte</Button>
                  <Button size="sm" variant={issue.status === "in_progress" ? "default" : "outline"} onClick={() => updateStatus(issue, "in_progress")}>En cours</Button>
                  <Button size="sm" variant={issue.status === "resolved" ? "default" : "outline"} onClick={() => updateStatus(issue, "resolved")}>Résolue</Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Summary({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-lg font-bold tabular-nums", className)}>
        {value}
      </p>
    </div>
  );
}
