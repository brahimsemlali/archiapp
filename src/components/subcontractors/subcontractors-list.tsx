"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Star, Phone, Mail, Trash2, Pencil, Search, HardHat } from "lucide-react";
import { deleteSubcontractorAction } from "@/lib/actions/subcontractors";
import type { SubcontractorRow } from "@/lib/actions/subcontractors";
import { SubcontractorForm } from "./subcontractor-form";
import { cn } from "@/lib/utils";

type Subcontractor = SubcontractorRow;

export function SubcontractorsList({ subcontractors: initial }: { subcontractors: Subcontractor[] }) {
  const [subcontractorSnapshot, setSubcontractorSnapshot] = useState({
    source: initial,
    subcontractors: initial,
  });
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subcontractor | null>(null);

  if (subcontractorSnapshot.source !== initial) {
    setSubcontractorSnapshot({ source: initial, subcontractors: initial });
  }

  const subcontractors = subcontractorSnapshot.subcontractors;
  const setSubcontractors = (update: Subcontractor[] | ((currentSubcontractors: Subcontractor[]) => Subcontractor[])) => {
    setSubcontractorSnapshot((current) => ({
      source: current.source,
      subcontractors: typeof update === "function" ? update(current.subcontractors) : update,
    }));
  };

  const visibleItems = subcontractors.filter((s) => !archivedIds.has(s.id));
  const filtered = visibleItems.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.trade ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    const result = await deleteSubcontractorAction(id);
    if (!result.ok) { toast.error(result.error); return; }
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    toast.success("Archivé.");
  }

  function handleSuccess(savedSubcontractor: SubcontractorRow) {
    setSubcontractors((prev) => {
      const exists = prev.some((item) => item.id === savedSubcontractor.id);
      const next = exists
        ? prev.map((item) => item.id === savedSubcontractor.id ? savedSubcontractor : item)
        : [...prev, savedSubcontractor];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <HardHat className="h-10 w-10 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-500">Aucun sous-traitant</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Ajoutez vos artisans et entreprises partenaires.</p>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sc) => (
            <div key={sc.id} className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{sc.name}</p>
                  {sc.trade && (
                    <Badge variant="outline" className="text-xs mt-1 text-slate-500 border-slate-200">{sc.trade}</Badge>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <button onClick={() => setEditing(sc)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(sc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {sc.rating != null && sc.rating > 0 && (
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={cn("h-3.5 w-3.5", n <= sc.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                  ))}
                </div>
              )}

              <div className="space-y-1">
                {sc.phone && (
                  <a href={`tel:${sc.phone}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary">
                    <Phone className="h-3 w-3" /> {sc.phone}
                  </a>
                )}
                {sc.email && (
                  <a href={`mailto:${sc.email}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary truncate">
                    <Mail className="h-3 w-3" /> {sc.email}
                  </a>
                )}
              </div>

              {sc.notes && (
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{sc.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent>
          <SheetHeader><SheetTitle>Ajouter un sous-traitant</SheetTitle></SheetHeader>
          <div>
            <SubcontractorForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>Modifier le sous-traitant</SheetTitle></SheetHeader>
          {editing && (
            <div>
              <SubcontractorForm
                subcontractor={{ ...editing, trade: editing.trade ?? undefined, phone: editing.phone ?? undefined, email: editing.email ?? undefined, address: editing.address ?? undefined, cnss: editing.cnss ?? undefined, rib: editing.rib ?? undefined, rating: editing.rating ?? undefined, notes: editing.notes ?? undefined }}
                onSuccess={handleSuccess}
                onCancel={() => setEditing(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
