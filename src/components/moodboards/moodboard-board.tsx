"use client";

import { useState, useRef, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Trash2, Loader2, Link as LinkIcon, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { displayExternalUrl, normalizeExternalUrl } from "@/lib/url";
import {
  addMoodboardImageAction,
  addMoodboardLinkAction,
  removeMoodboardImageAction,
} from "@/lib/actions/moodboards";
import type { InspirationItem } from "@/components/projects/inspiration-board";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageFile } from "@/lib/upload-rules";

interface MoodboardBoardProps {
  moodboardId: string;
  initialItems: InspirationItem[];
}

type AddMode = "upload" | "link";

export function MoodboardBoard({ moodboardId, initialItems }: MoodboardBoardProps) {
  const [items, setItems] = useState<InspirationItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkCaption, setLinkCaption] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("upload");
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedImageFile(file)) { toast.error("Fichier image requis : JPG, PNG ou WEBP."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop lourde (max 10 Mo)."); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("caption", caption);
    formData.append("source", sourceUrl);

    const result = await addMoodboardImageAction(moodboardId, formData);
    setUploading(false);

    if (!result.ok) { toast.error(result.error); return; }
    setItems((prev) => [...prev, result.data]);
    setCaption("");
    setSourceUrl("");
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Image ajoutée.");
  }

  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setUploading(true);
    const result = await addMoodboardLinkAction(moodboardId, linkUrl.trim(), linkCaption.trim() || undefined);
    setUploading(false);

    if (!result.ok) { toast.error(result.error); return; }
    setItems((prev) => [...prev, result.data]);
    setLinkUrl("");
    setLinkCaption("");
    setShowForm(false);
    toast.success("Image ajoutée depuis le lien.");
  }

  function handleRemove(id: string) {
    setPendingRemoveId(id);
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    const id = pendingRemoveId;
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await removeMoodboardImageAction(moodboardId, id);
      if (!result.ok) {
        toast.error("Erreur lors de la suppression.");
        setItems(prev);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "default" : "outline"}
          className="gap-1.5"
        >
          <Plus className={`h-3.5 w-3.5 transition-transform duration-300 ${showForm ? "rotate-45" : ""}`} />
          {showForm ? "Fermer" : "Ajouter une référence"}
        </Button>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {items.length} image{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {showForm && (
        <div className="premium-fade-up overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          {/* Mode tabs */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => setAddMode("upload")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                addMode === "upload"
                  ? "text-slate-900 border-b-2 border-primary -mb-px"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Télécharger
            </button>
            <button
              type="button"
              onClick={() => setAddMode("link")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                addMode === "link"
                  ? "text-slate-900 border-b-2 border-primary -mb-px"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Coller un lien
            </button>
          </div>

          <div className="p-4">
            {addMode === "upload" ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Légende (optionnel)</label>
                    <Input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Ex : Matériau de référence"
                      className="text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Source / URL (optionnel)</label>
                    <Input
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="text-sm h-9"
                    />
                  </div>
                </div>
                <div
                  className="group/drop cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition-transform duration-300 group-hover/drop:-translate-y-0.5">
                        <ImageIcon className="h-6 w-6 text-slate-300 transition-colors group-hover/drop:text-primary/70" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Cliquez pour choisir une image</p>
                      <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP · max 10 Mo</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept={IMAGE_UPLOAD_ACCEPT} className="hidden" onChange={handleFileChange} />
              </div>
            ) : (
              <form onSubmit={handleLinkSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">
                    URL de la page ou de l'image
                  </label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://www.behance.net/... ou https://pinterest.com/..."
                    className="text-sm h-9 font-mono"
                    autoFocus
                    disabled={uploading}
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Fonctionne avec Behance, Pinterest, Houzz, Dezeen, et toute URL d'image directe.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Légende (optionnel)</label>
                  <Input
                    value={linkCaption}
                    onChange={(e) => setLinkCaption(e.target.value)}
                    placeholder="Laissez vide pour utiliser le titre de la page"
                    className="text-sm h-9"
                    disabled={uploading}
                  />
                </div>
                <Button type="submit" size="sm" disabled={uploading || !linkUrl.trim()} className="w-full">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Chargement de l'image…
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Importer depuis ce lien
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="columns-2 gap-3 space-y-3 sm:columns-3 lg:columns-4">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="mb-tile premium-fade-up group relative block break-inside-avoid overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"
              style={{ animationDelay: `${Math.min(i, 16) * 35}ms` }}
            >
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.caption ?? "Moodboard image"}
                  className="block w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={isPending}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-600 opacity-0 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {(item.caption || item.source) && (
                <div className="px-3 py-2.5">
                  {item.caption && <p className="truncate text-xs font-medium text-slate-700">{item.caption}</p>}
                  {item.source && normalizeExternalUrl(item.source) && (
                    <a
                      href={normalizeExternalUrl(item.source) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400 transition-colors hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{displayExternalUrl(normalizeExternalUrl(item.source) ?? item.source)}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-8 py-16 text-center">
          <div className="mb-atmos" aria-hidden />
          <div className="relative z-10 mx-auto flex max-w-xs flex-col items-center">
            <div className="relative mb-5 h-16 w-16">
              <div className="absolute inset-0 rounded-2xl border border-slate-200" />
              <div className="absolute inset-2 rounded-xl border border-dashed border-slate-200" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-300" />
              </div>
            </div>
            <p className="section-title text-lg text-slate-900">Le mur est nu</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Ajoutez vos premières références — matériaux, ambiances, palettes…
            </p>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!pendingRemoveId}
        onOpenChange={(open) => { if (!open) setPendingRemoveId(null); }}
        title="Supprimer cette image ?"
        confirmLabel="Supprimer"
        onConfirm={confirmRemove}
      />
    </div>
  );
}
