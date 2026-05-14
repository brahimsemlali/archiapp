"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatMAD } from "@/lib/format";
import { displayExternalUrl, normalizeExternalUrl } from "@/lib/url";
import { createSupplierAction, updateSupplierAction, deleteSupplierAction, createCatalogItemAction, updateCatalogItemAction, deleteCatalogItemAction } from "@/lib/actions/suppliers";
import type { SupplierValues, CatalogItemValues } from "@/lib/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Star, Phone, Mail, Globe, Trash2, Edit, Search, ExternalLink } from "lucide-react";

const SUPPLIER_CATEGORIES = [
  "carrelage", "sanitaire", "menuiserie", "peinture", "electricite",
  "plomberie", "metal", "verre", "marbre", "beton", "isolation",
  "cuisine", "eclairage", "serrurerie", "autre",
];

const UNITS = ["m²", "ml", "u", "kg", "T", "m³", "forfait", "heure", "L"];

type Supplier = { id: string; name: string; category: string | null; phone: string | null; email: string | null; address: string | null; website: string | null; notes: string | null; rating: number | null };
type CatalogItem = { id: string; supplier_id: string | null; name: string; description: string | null; unit: string; unit_price_centimes: number; category: string | null; reference: string | null; last_updated: string | null; suppliers?: { name: string } | null };

interface Props { initialSuppliers: Supplier[]; initialItems: CatalogItem[] }

export function SuppliersPage({ initialSuppliers, initialItems }: Props) {
  const t = useTranslations("common");
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [sForm, setSForm] = useState<SupplierValues>({ name: "" });
  const [iForm, setIForm] = useState<CatalogItemValues>({ name: "", unit: "m²", unitPriceCentimes: 0 });

  const filteredSuppliers = suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.category ?? "").toLowerCase().includes(search.toLowerCase()));
  const filteredItems = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.suppliers?.name ?? "").toLowerCase().includes(search.toLowerCase()));

  async function saveSupplier() {
    if (!sForm.name?.trim()) { toast.error("Nom requis."); return; }
    setSaving(true);
    if (editingSupplier) {
      const r = await updateSupplierAction(editingSupplier.id, sForm);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      setSuppliers((prev) => prev.map((s) => s.id === editingSupplier.id ? { ...s, ...sForm, category: sForm.category ?? null, phone: sForm.phone ?? null, email: sForm.email ?? null, address: sForm.address ?? null, website: sForm.website ?? null, notes: sForm.notes ?? null, rating: sForm.rating ?? null } : s));
      toast.success("Fournisseur mis à jour.");
    } else {
      const r = await createSupplierAction(sForm);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      router.refresh();
      toast.success("Fournisseur créé.");
    }
    setSaving(false);
    setSupplierOpen(false);
  }

  async function saveItem() {
    if (!iForm.name?.trim()) { toast.error("Nom requis."); return; }
    setSaving(true);
    if (editingItem) {
      const r = await updateCatalogItemAction(editingItem.id, iForm);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...iForm, supplier_id: iForm.supplierId ?? null, description: iForm.description ?? null, category: iForm.category ?? null, reference: iForm.reference ?? null, last_updated: iForm.lastUpdated ?? null } : i));
      toast.success("Article mis à jour.");
    } else {
      const r = await createCatalogItemAction(iForm);
      if (!r.ok) { toast.error(r.error); setSaving(false); return; }
      router.refresh();
      toast.success("Article créé.");
    }
    setSaving(false);
    setItemOpen(false);
  }

  async function delSupplier(id: string) {
    setSuppliers((p) => p.filter((s) => s.id !== id));
    await deleteSupplierAction(id);
    toast.success("Fournisseur supprimé.");
  }

  async function delItem(id: string) {
    setItems((p) => p.filter((i) => i.id !== id));
    await deleteCatalogItemAction(id);
    toast.success("Article supprimé.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#82806F]" />
          <Input className="pl-9" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="fournisseurs">
        <TabsList className="h-9 bg-[#F2F2EE] border border-[#E8E6DF] p-0.5 rounded-lg">
          <TabsTrigger value="fournisseurs" className="text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#16170E] text-[#82806F]">Fournisseurs ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="catalogue" className="text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#16170E] text-[#82806F]">Catalogue prix ({items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fournisseurs" className="mt-4 space-y-3">
          <Button onClick={() => { setEditingSupplier(null); setSForm({ name: "" }); setSupplierOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nouveau fournisseur
          </Button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers.map((s) => (
              <div key={s.id} className="bg-white border border-[#E8E6DF] rounded-xl p-4 space-y-2 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#16170E]">{s.name}</p>
                    {s.category && <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{s.category}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingSupplier(s); setSForm({ name: s.name, category: s.category ?? undefined, phone: s.phone ?? undefined, email: s.email ?? undefined, address: s.address ?? undefined, website: s.website ?? undefined, notes: s.notes ?? undefined, rating: s.rating ?? undefined }); setSupplierOpen(true); }} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#F2F2EE]"><Edit className="h-3.5 w-3.5 text-[#82806F]" /></button>
                    <button onClick={() => delSupplier(s.id)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                </div>
                {s.rating && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < s.rating! ? "text-amber-400 fill-amber-400" : "text-[#E8E6DF]"}`} />
                    ))}
                  </div>
                )}
                <div className="space-y-1 text-xs text-[#82806F]">
                  {s.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{s.phone}</div>}
                  {s.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{s.email}</div>}
                  {s.website && normalizeExternalUrl(s.website) && (
                    <a href={normalizeExternalUrl(s.website) ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#16170E]">
                      <Globe className="h-3 w-3" />
                      {displayExternalUrl(normalizeExternalUrl(s.website) ?? s.website)}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-[#82806F]">{items.filter((i) => i.supplier_id === s.id).length} articles au catalogue</p>
              </div>
            ))}
          </div>
          {filteredSuppliers.length === 0 && <p className="text-sm text-[#82806F] text-center py-8">Aucun fournisseur.</p>}
        </TabsContent>

        <TabsContent value="catalogue" className="mt-4 space-y-3">
          <Button onClick={() => { setEditingItem(null); setIForm({ name: "", unit: "m²", unitPriceCentimes: 0 }); setItemOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Ajouter un article
          </Button>
          <div className="bg-white border border-[#E8E6DF] rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_120px_80px_100px_80px_80px] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#82806F] bg-[#F2F2EE]">
              <span>Article</span>
              <span>Fournisseur</span>
              <span>Unité</span>
              <span className="text-right">Prix unitaire</span>
              <span>Réf.</span>
              <span></span>
            </div>
            {filteredItems.map((item) => (
              <div key={item.id} className="px-4 py-3 border-t border-[#E8E6DF] first:border-0 hover:bg-[#F2F2EE]/40 transition-colors">
                <div className="hidden sm:grid grid-cols-[1fr_120px_80px_100px_80px_80px] gap-2 items-center text-sm">
                  <div>
                    <p className="font-medium text-[#16170E]">{item.name}</p>
                    {item.description && <p className="text-xs text-[#82806F]">{item.description}</p>}
                    {item.category && <Badge variant="outline" className="text-[9px] mt-0.5">{item.category}</Badge>}
                  </div>
                  <span className="text-xs text-[#82806F]">{item.suppliers?.name ?? "—"}</span>
                  <span className="text-xs text-[#82806F]">{item.unit}</span>
                  <span className="text-right font-semibold">{formatMAD(item.unit_price_centimes)}</span>
                  <span className="text-xs text-[#82806F]">{item.reference ?? "—"}</span>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setEditingItem(item); setIForm({ supplierId: item.supplier_id ?? undefined, name: item.name, description: item.description ?? undefined, unit: item.unit, unitPriceCentimes: item.unit_price_centimes, category: item.category ?? undefined, reference: item.reference ?? undefined }); setItemOpen(true); }} className="h-7 w-7 flex items-center justify-center rounded hover:bg-white"><Edit className="h-3.5 w-3.5 text-[#82806F]" /></button>
                    <button onClick={() => delItem(item.id)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                </div>
                <div className="sm:hidden">
                  <div className="flex justify-between">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="font-semibold text-sm">{formatMAD(item.unit_price_centimes)}/{item.unit}</p>
                  </div>
                  {item.suppliers?.name && <p className="text-xs text-[#82806F]">{item.suppliers.name}</p>}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && <p className="text-sm text-[#82806F] text-center py-8">Aucun article.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Supplier dialog */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>Nom *</Label><Input value={sForm.name} onChange={(e) => setSForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={sForm.category ?? "autre"} onValueChange={(v) => setSForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUPPLIER_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Select value={String(sForm.rating ?? "")} onValueChange={(v) => setSForm((f) => ({ ...f, rating: v ? parseInt(v) : undefined }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map((r) => <SelectItem key={r} value={String(r)}>{"★".repeat(r)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Téléphone</Label><Input value={sForm.phone ?? ""} onChange={(e) => setSForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={sForm.email ?? ""} onChange={(e) => setSForm((f) => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Site web</Label><Input value={sForm.website ?? ""} onChange={(e) => setSForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://…" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={sForm.notes ?? ""} onChange={(e) => setSForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2 pt-1">
              <Button onClick={saveSupplier} disabled={saving} className="flex-1">{saving ? "…" : editingSupplier ? t("save") : t("create")}</Button>
              <Button variant="outline" onClick={() => setSupplierOpen(false)}>{t("cancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "Modifier l'article" : "Nouvel article"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>Désignation *</Label><Input value={iForm.name} onChange={(e) => setIForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex : Carrelage 60×60 rectifié" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={iForm.description ?? ""} onChange={(e) => setIForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fournisseur</Label>
                <Select value={iForm.supplierId ?? "none"} onValueChange={(v) => v && setIForm((f) => ({ ...f, supplierId: v === "none" ? undefined : v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unité</Label>
                <Select value={iForm.unit} onValueChange={(v) => v && setIForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prix unitaire (MAD HT)</Label>
                <Input type="number" value={iForm.unitPriceCentimes / 100 || ""} onChange={(e) => setIForm((f) => ({ ...f, unitPriceCentimes: Math.round(parseFloat(e.target.value || "0") * 100) }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5"><Label>Référence</Label><Input value={iForm.reference ?? ""} onChange={(e) => setIForm((f) => ({ ...f, reference: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={saveItem} disabled={saving} className="flex-1">{saving ? "…" : editingItem ? t("save") : t("create")}</Button>
              <Button variant="outline" onClick={() => setItemOpen(false)}>{t("cancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
