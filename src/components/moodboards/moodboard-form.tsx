"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createMoodboardAction, updateMoodboardAction } from "@/lib/actions/moodboards";

interface Client {
  id: string;
  name: string;
}

interface MoodboardFormProps {
  clients: Client[];
  initial?: {
    id: string;
    title: string;
    description?: string | null;
    clientId?: string | null;
  };
}

export function MoodboardForm({ clients, initial }: MoodboardFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const values = { title, description, clientId: clientId || undefined };

    const result = initial
      ? await updateMoodboardAction(initial.id, values)
      : await createMoodboardAction(values);

    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (!initial && result.ok && "data" in result && result.data) {
      toast.success("Moodboard créé.");
      router.push(`/moodboards/${result.data.id}`);
    } else {
      toast.success("Moodboard mis à jour.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200/60 rounded-xl p-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-xs font-semibold text-slate-600">Titre *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Appartement minimaliste — Palette neutre"
          required
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs font-semibold text-slate-600">Description (optionnel)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ambiance, style, direction artistique…"
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client" className="text-xs font-semibold text-slate-600">Client associé (optionnel)</Label>
        <select
          id="client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Aucun client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
          {t("cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={loading || !title.trim()} className="shadow-sm shadow-primary/20">
          {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {initial ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
