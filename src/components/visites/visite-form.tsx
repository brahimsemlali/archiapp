"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, Camera, Plus, Trash2, Loader2, Sparkles, MapPin, X } from "lucide-react";
import Image from "next/image";
import { createVisiteAction, createVisitePhotoUploadUrlAction } from "@/lib/actions/visites";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Observation } from "@/lib/actions/visites";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageFile } from "@/lib/upload-rules";

const ZONES = ["Gros œuvre", "Façade", "Toiture", "Intérieur", "Fondations", "Chantier général", "Autre"];

interface VisiteFormProps {
  projectId: string;
  projectTitle: string;
  aiEnabled: boolean;
}

function newObservation(): Observation {
  return {
    id: globalThis.crypto.randomUUID(),
    zone: "Chantier général",
    note: "",
    photoUrl: undefined,
    photoPath: undefined,
    createIssue: false,
    issuePriority: "medium",
    issueTitle: "",
  };
}

export function VisiteForm({ projectId, projectTitle, aiEnabled }: VisiteFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(`Visite de chantier — ${new Date().toLocaleDateString("fr-MA")}`);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState("");
  const [attendees, setAttendees] = useState("");
  const [observations, setObservations] = useState<Observation[]>([newObservation()]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  function updateObs(idx: number, patch: Partial<Observation>) {
    setObservations((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }

  async function handlePhotoChange(idx: number, file: File) {
    if (!isAllowedImageFile(file)) { toast.error("Photo requise : JPG, PNG ou WEBP."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Photo trop lourde (max 10 Mo)."); return; }
    setUploadingIdx(idx);
    // Direct-to-storage signed upload (bypasses the Vercel server-action body cap)
    const ticket = await createVisitePhotoUploadUrlAction(projectId, { name: file.name, type: file.type, size: file.size });
    if (!ticket.ok) { setUploadingIdx(null); toast.error(ticket.error); return; }
    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from(ticket.data.bucket)
      .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, { contentType: ticket.data.contentType });
    if (uploadError) { setUploadingIdx(null); toast.error(uploadError.message); return; }
    const { data: preview } = await supabase.storage.from(ticket.data.bucket).createSignedUrl(ticket.data.path, 60 * 60);
    setUploadingIdx(null);
    updateObs(idx, { photoUrl: preview?.signedUrl ?? "", photoPath: ticket.data.path });
  }

  async function handleGenerateSummary() {
    if (!aiEnabled) {
      toast.error("La synthèse IA est disponible sur les plans Studio AI et Agence AI.");
      return;
    }

    const obsText = observations
      .filter((o) => o.note.trim())
      .map((o) => `Zone: ${o.zone} — ${o.note}`)
      .join("\n");
    if (!obsText) { toast.error("Ajoutez des observations avant de générer."); return; }

    setGenerating(true);
    try {
      const res = await fetch("/api/visites/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectTitle, observations: obsText, date: visitDate }),
      });
      const json = await res.json() as { summary?: string; error?: string };
      if (!res.ok || !json.summary) { toast.error(json.error ?? "Erreur IA"); return; }
      setSummaryText(json.summary);
      toast.success("Synthèse générée par IA.");
    } catch {
      toast.error("Erreur de connexion.");
    } finally {
      setGenerating(false);
    }
  }

  const [summaryText, setSummaryText] = useState("");

  const handleSave = useCallback(async () => {
    if (!title.trim()) { toast.error("Titre requis."); return; }
    if (observations.every((o) => !o.note.trim())) { toast.error("Ajoutez au moins une observation."); return; }

    setSaving(true);
    const result = await createVisiteAction({
      projectId,
      title,
      visitDate,
      weather: weather || undefined,
      attendees: attendees || undefined,
      observations,
      summary: summaryText || undefined,
      aiGenerated: !!summaryText,
    });
    setSaving(false);

    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Visite enregistrée.");
    router.push(`/projects/${projectId}/visites`);
  }, [projectId, title, visitDate, weather, attendees, observations, summaryText, router]);

  return (
    <div className="space-y-6">
      {/* Header fields */}
      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Titre de la visite</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Météo</Label>
            <Input placeholder="ex: Ensoleillé, 22°C" value={weather} onChange={(e) => setWeather(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Présents</Label>
            <Input placeholder="Architecte, entrepreneur..." value={attendees} onChange={(e) => setAttendees(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Observations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Observations ({observations.length})</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setObservations((p) => [...p, newObservation()])}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>

        <div className="space-y-3">
          {observations.map((obs, idx) => (
            <div key={obs.id} className="bg-white border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <select
                    value={obs.zone}
                    onChange={(e) => updateObs(idx, { zone: e.target.value })}
                    className="text-sm font-medium bg-transparent border-0 outline-none flex-1 min-w-0"
                  >
                    {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <Button
                  type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setObservations((p) => p.filter((_, i) => i !== idx))}
                  disabled={observations.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                placeholder="Décrivez ce que vous observez : état d'avancement, problèmes constatés, réserves..."
                rows={2}
                value={obs.note}
                onChange={(e) => updateObs(idx, { note: e.target.value })}
                className="resize-none"
              />

              <div className="rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!obs.createIssue}
                    onChange={(e) => updateObs(idx, { createIssue: e.target.checked })}
                    className="mt-1"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-[#0B1220]">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Ajouter à la punch list
                    </span>
                    <span className="block text-xs text-[#64748B]">
                      Crée une réserve assignable à suivre jusqu'à résolution.
                    </span>
                  </span>
                </label>
                {obs.createIssue && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
                    <Input
                      value={obs.issueTitle ?? ""}
                      onChange={(e) => updateObs(idx, { issueTitle: e.target.value })}
                      placeholder="Titre de la réserve (optionnel)"
                      className="text-sm"
                    />
                    <select
                      value={obs.issuePriority ?? "medium"}
                      onChange={(e) => updateObs(idx, { issuePriority: e.target.value as Observation["issuePriority"] })}
                      className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                    >
                      <option value="low">Priorité basse</option>
                      <option value="medium">Priorité moyenne</option>
                      <option value="high">Priorité haute</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Photo */}
              {obs.photoUrl ? (
                <div className="relative">
                  <Image
                    src={obs.photoUrl}
                    alt="Photo observation"
                    width={400}
                    height={200}
                    className="w-full h-40 object-cover rounded-lg border"
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white text-destructive h-7 w-7"
                    onClick={() => updateObs(idx, { photoUrl: undefined, photoPath: undefined })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    capture="environment"
                    className="hidden"
                    ref={(el) => { fileRefs.current[idx] = el; }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoChange(idx, f); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => fileRefs.current[idx]?.click()}
                    disabled={uploadingIdx === idx}
                  >
                    {uploadingIdx === idx ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    {uploadingIdx === idx ? "Envoi..." : "Ajouter une photo"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">Synthèse du rapport</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={generating || !aiEnabled}
            title={aiEnabled ? "Générer une synthèse IA" : "Disponible sur Studio AI et Agence AI"}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
            )}
            {generating ? "Génération..." : aiEnabled ? "Générer avec IA" : "IA non incluse"}
          </Button>
        </div>
        <Textarea
          placeholder="Rédigez ou générez une synthèse globale de la visite de chantier..."
          rows={5}
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
        />
      </div>

      {/* Save */}
      <div className="flex gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer la visite
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
      </div>
    </div>
  );
}
