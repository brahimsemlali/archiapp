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
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "default" : "outline"}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
        <span className="text-sm text-slate-400">{items.length} image{items.length !== 1 ? "s" : ""}</span>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden">
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
                  className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:bg-slate-50 hover:border-primary/30 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500 font-medium">Cliquez pour choisir une image</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP · max 10 Mo</p>
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
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid group relative rounded-xl overflow-hidden border border-slate-200/60 bg-white shadow-sm"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.caption ?? "Moodboard image"}
                  className="w-full object-cover block"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={isPending}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {(item.caption || item.source) && (
                <div className="px-3 py-2">
                  {item.caption && <p className="text-xs font-medium text-slate-700 truncate">{item.caption}</p>}
                  {item.source && normalizeExternalUrl(item.source) && (
                    <a
                      href={normalizeExternalUrl(item.source) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary truncate mt-0.5"
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
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">Aucune image pour l'instant</p>
          <p className="text-xs text-slate-400 mt-1">Ajoutez des références visuelles, matériaux, ambiances…</p>
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
