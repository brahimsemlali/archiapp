"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, PackagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBoqItemAction, deleteBoqItemAction, updateBoqItemAction } from "@/lib/actions/boq-items";
import { formatMAD } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BoqItemRow {
  id: string;
  project_id: string;
  supplier_id: string | null;
  item_name: string;
  category: string | null;
  quantity: number | string;
  unit: string;
  estimated_cost_centimes: number;
  actual_cost_centimes: number;
  procurement_status: "not_started" | "requested" | "ordered" | "delivered" | "installed" | "cancelled";
  notes: string | null;
  projects?: { title: string } | { title: string }[] | null;
  suppliers?: { name: string } | { name: string }[] | null;
}

interface ProjectOption { id: string; title: string }
interface SupplierOption { id: string; name: string }

const STATUS_LABELS: Record<BoqItemRow["procurement_status"], string> = {
  not_started: "À prévoir",
  requested: "Demandé",
  ordered: "Commandé",
  delivered: "Livré",
  installed: "Installé",
  cancelled: "Annulé",
};

const STATUS_CLASSES: Record<BoqItemRow["procurement_status"], string> = {
  not_started: "bg-[#F2F2EE] text-[#6B6B5A]",
  requested: "bg-blue-50 text-blue-700",
  ordered: "bg-amber-50 text-amber-700",
  delivered: "bg-[#E5F3EB] text-[#2F8F5C]",
  installed: "bg-[#16170E] text-white",
  cancelled: "bg-[#FCEFE6] text-[#C75B2E]",
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function BoqManager({
  items,
  projects,
  suppliers,
  defaultProjectId,
}: {
  items: BoqItemRow[];
  projects: ProjectOption[];
  suppliers: SupplierOption[];
  defaultProjectId?: string;
}) {
  const t = useTranslations("common");
  const [rows, setRows] = useState(items);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectId: defaultProjectId ?? projects[0]?.id ?? "",
    supplierId: "none",
    itemName: "",
    category: "",
    quantity: "1",
    unit: "u",
    estimatedCost: "",
    actualCost: "",
    procurementStatus: "not_started" as BoqItemRow["procurement_status"],
    notes: "",
  });

  const totals = useMemo(() => {
    const estimated = rows.reduce((sum, row) => sum + (row.estimated_cost_centimes ?? 0), 0);
    const actual = rows.reduce((sum, row) => sum + (row.actual_cost_centimes ?? 0), 0);
    const ordered = rows.filter((row) => ["ordered", "delivered", "installed"].includes(row.procurement_status)).length;
    return { estimated, actual, remaining: estimated - actual, ordered };
  }, [rows]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.projectId) { toast.error("Sélectionnez un projet."); return; }
    if (!form.itemName.trim()) { toast.error("Le nom de l'article est requis."); return; }

    setSaving(true);
    const result = await createBoqItemAction({
      projectId: form.projectId,
      supplierId: form.supplierId === "none" ? undefined : form.supplierId,
      itemName: form.itemName,
      category: form.category || undefined,
      quantity: Number(form.quantity || 0),
      unit: form.unit || "u",
      estimatedCost: form.estimatedCost || 0,
      actualCost: form.actualCost || 0,
      procurementStatus: form.procurementStatus,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }

    const project = projects.find((p) => p.id === form.projectId);
    const supplier = suppliers.find((s) => s.id === form.supplierId);
    setRows((prev) => [{
      id: result.data.id,
      project_id: form.projectId,
      supplier_id: form.supplierId === "none" ? null : form.supplierId,
      item_name: form.itemName,
      category: form.category || null,
      quantity: form.quantity,
      unit: form.unit || "u",
      estimated_cost_centimes: Math.round(Number(form.estimatedCost || 0) * 100),
      actual_cost_centimes: Math.round(Number(form.actualCost || 0) * 100),
      procurement_status: form.procurementStatus,
      notes: form.notes || null,
      projects: project ? { title: project.title } : null,
      suppliers: supplier ? { name: supplier.name } : null,
    }, ...prev]);
    setForm((current) => ({
      ...current,
      supplierId: "none",
      itemName: "",
      category: "",
      quantity: "1",
      unit: "u",
      estimatedCost: "",
      actualCost: "",
      notes: "",
    }));
    toast.success("Article BOQ ajouté.");
  }

  async function handleStatus(row: BoqItemRow, status: BoqItemRow["procurement_status"]) {
    setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, procurement_status: status } : item));
    const result = await updateBoqItemAction(row.id, { procurementStatus: status });
    if (!result.ok) {
      setRows((prev) => prev.map((item) => item.id === row.id ? row : item));
      toast.error(result.error);
    }
  }

  async function handleDelete(row: BoqItemRow) {
    const result = await deleteBoqItemAction(row.id);
    if (!result.ok) { toast.error(result.error); return; }
    setRows((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("Article supprimé.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Summary label="Budget estimé" value={formatMAD(totals.estimated)} />
        <Summary label="Coût réel" value={totals.actual > 0 ? formatMAD(totals.actual) : "—"} />
        <Summary label="Écart" value={totals.estimated > 0 ? formatMAD(totals.remaining) : "—"} danger={totals.remaining < 0} />
        <Summary label="Commandés/livrés" value={`${totals.ordered}/${rows.length}`} />
      </div>

      <form onSubmit={handleCreate} className="rounded-xl border border-[#E8E6DF] bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-4 w-4 text-[#6B6B5A]" />
          <p className="text-sm font-semibold text-[#16170E]">Nouvel article BOQ</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {!defaultProjectId && (
            <div className="space-y-1.5 md:col-span-2">
              <Label>Projet *</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Projet" /></SelectTrigger>
                <SelectContent>
                  {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5 md:col-span-2">
            <Label>Article *</Label>
            <Input value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} placeholder="Carrelage zellige, menuiserie..." />
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Finition" />
          </div>
          <div className="space-y-1.5">
            <Label>Quantité</Label>
            <Input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Unité</Label>
            <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Estimé MAD</Label>
            <Input type="number" min="0" step="0.01" value={form.estimatedCost} onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Réel MAD</Label>
            <Input type="number" min="0" step="0.01" value={form.actualCost} onChange={(e) => setForm((f) => ({ ...f, actualCost: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Fournisseur</Label>
            <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v ?? "none" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non défini</SelectItem>
                {suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={form.procurementStatus} onValueChange={(v) => setForm((f) => ({ ...f, procurementStatus: v as BoqItemRow["procurement_status"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-4">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ajouter
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-[#E8E6DF] bg-white overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#82806F]">Aucun article BOQ pour l'instant.</div>
        ) : (
          <div className="divide-y divide-[#F0EEE8]">
            {rows.map((row) => (
              <div key={row.id} className="grid gap-3 p-4 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-[#16170E]">{row.item_name}</p>
                  <p className="mt-0.5 text-xs text-[#82806F]">
                    {relationOne(row.projects)?.title ?? "Projet"}{row.category ? ` · ${row.category}` : ""}{relationOne(row.suppliers)?.name ? ` · ${relationOne(row.suppliers)?.name}` : ""}
                  </p>
                  {row.notes && <p className="mt-1 text-xs text-[#6B6B5A]">{row.notes}</p>}
                </div>
                <p className="text-sm text-[#6B6B5A] tabular-nums">{Number(row.quantity).toLocaleString("fr-FR")} {row.unit}</p>
                <p className="text-sm font-medium tabular-nums">{row.estimated_cost_centimes ? formatMAD(row.estimated_cost_centimes) : "—"}</p>
                <p className={cn("text-sm font-medium tabular-nums", row.actual_cost_centimes > row.estimated_cost_centimes && row.estimated_cost_centimes > 0 ? "text-[#C75B2E]" : "")}>
                  {row.actual_cost_centimes ? formatMAD(row.actual_cost_centimes) : "—"}
                </p>
                <Select value={row.procurement_status} onValueChange={(v) => handleStatus(row, v as BoqItemRow["procurement_status"])}>
                  <SelectTrigger className={cn("h-8 w-full", STATUS_CLASSES[row.procurement_status])}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-1">
                  {row.procurement_status !== "installed" && (
                    <Button size="icon" variant="outline" onClick={() => handleStatus(row, "installed")} title="Marquer installé">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="outline" onClick={() => handleDelete(row)} title={t("delete")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E8E6DF] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#82806F]">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", danger ? "text-[#C75B2E]" : "text-[#16170E]")}>{value}</p>
    </div>
  );
}
