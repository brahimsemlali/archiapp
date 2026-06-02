"use client";

import { useState, useRef, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Image from "next/image";
import { Plus, Trash2, Loader2, Link as LinkIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { addInspirationAction, removeInspirationAction } from "@/lib/actions/projects";
import { displayExternalUrl, normalizeExternalUrl } from "@/lib/url";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageFile } from "@/lib/upload-rules";

export interface InspirationItem {
  id: string;
  url: string;
  path?: string;
  caption?: string;
  source?: string;
  uploadedAt: string;
}

interface InspirationBoardProps {
  projectId: string;
  initialItems: InspirationItem[];
}

export function InspirationBoard({ projectId, initialItems }: InspirationBoardProps) {
  const [items, setItems] = useState<InspirationItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFilePick() {
    fileRef.current?.click();
  }

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

    const result = await addInspirationAction(projectId, formData);
    setUploading(false);

    if (!result.ok) { toast.error(result.error); return; }
    setItems((prev) => [...prev, result.data]);
    setCaption("");
    setSourceUrl("");
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Image ajoutée au tableau d'inspiration.");
  }

  function handleRemove(id: string) {
    setPendingRemoveId(id);
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    const id = pendingRemoveId;
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await removeInspirationAction(projectId, id);
      if (!result.ok) {
        toast.error("Erreur lors de la suppression.");
        setItems(initialItems);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={() => setShowForm((v) => !v)} variant={showForm ? "default" : "outline"}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une image
        </Button>
        <span className="text-sm text-muted-foreground">{items.length} image{items.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Légende (optionnel)</label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ex : Matériau de référence"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Source / URL (optionnel)</label>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm"
              />
            </div>
          </div>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={handleFilePick}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-muted-foreground">Cliquez pour choisir une image</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · max 10 Mo</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept={IMAGE_UPLOAD_ACCEPT} className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* Grid */}
      {items.length > 0 ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="break-inside-avoid group relative rounded-xl overflow-hidden border bg-white shadow-sm">
              <div className="relative">
                <Image
                  src={item.url}
                  alt={item.caption ?? "Inspiration"}
                  width={400}
                  height={300}
                  className="w-full object-cover"
                />
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={isPending}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-50 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {(item.caption || item.source) && (
                <div className="px-3 py-2">
                  {item.caption && <p className="text-xs font-medium text-gray-700 truncate">{item.caption}</p>}
                  {item.source && normalizeExternalUrl(item.source) && (
                    <a
                      href={normalizeExternalUrl(item.source) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate mt-0.5"
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
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Aucune image pour l'instant</p>
          <p className="text-xs mt-1">Ajoutez des références visuelles, matériaux, ambiances…</p>
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
