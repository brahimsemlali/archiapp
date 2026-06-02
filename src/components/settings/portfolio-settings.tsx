"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Globe, ExternalLink, Eye, EyeOff, Plus, X } from "lucide-react";
import { updatePortfolioSettingsAction } from "@/lib/actions/settings";

interface PortfolioSettingsProps {
  currentSlug: string | null;
  portfolioEnabled: boolean;
  portfolioTagline: string | null;
  portfolioSpecialties: string[] | null;
  appUrl: string;
}

export function PortfolioSettings({
  currentSlug,
  portfolioEnabled,
  portfolioTagline,
  portfolioSpecialties,
  appUrl,
}: PortfolioSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState(currentSlug ?? "");
  const [enabled, setEnabled] = useState(portfolioEnabled);
  const [tagline, setTagline] = useState(portfolioTagline ?? "");
  const [specialties, setSpecialties] = useState<string[]>(portfolioSpecialties ?? []);
  const [newSpec, setNewSpec] = useState("");

  function slugify(v: string) {
    return v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50);
  }

  async function handleSave() {
    if (!slug.trim()) { toast.error("L'identifiant est requis."); return; }
    setSaving(true);
    const result = await updatePortfolioSettingsAction({
      slug: slugify(slug),
      enabled,
      tagline: tagline || null,
      specialties: specialties.length ? specialties : null,
    });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Paramètres du portfolio enregistrés.");
  }

  const portfolioUrl = `${appUrl}/p/${slugify(slug)}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">Page portfolio publique</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Une page accessible à tous avec vos réalisations et vos coordonnées.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-primary" : "bg-slate-200"}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portfolio-slug">Identifiant unique (URL)</Label>
        <div className="flex gap-2">
          <div className="flex items-center flex-1 border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
            <span className="px-3 text-sm text-slate-400 bg-slate-50 border-r py-2 shrink-0">{`${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/^https?:\/\//, "")}/p/`}</span>
            <input
              id="portfolio-slug"
              className="flex-1 px-3 py-2 text-sm outline-none bg-white"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="votre-cabinet"
            />
          </div>
          {slug && (
            <a
              href={portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {slug ? `Votre portfolio : ${portfolioUrl}` : "Choisissez un identifiant unique pour votre portfolio."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portfolio-tagline">Accroche</Label>
        <Textarea
          id="portfolio-tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Architecture contemporaine et design durable au Maroc…"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Spécialités</Label>
        <div className="flex flex-wrap gap-2">
          {specialties.map((spec) => (
            <Badge key={spec} variant="secondary" className="gap-1 pr-1 text-xs">
              {spec}
              <button onClick={() => setSpecialties((p) => p.filter((s) => s !== spec))} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newSpec}
            onChange={(e) => setNewSpec(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSpec.trim()) {
                setSpecialties((p) => [...p, newSpec.trim()]);
                setNewSpec("");
                e.preventDefault();
              }
            }}
            placeholder="Villa, Rénovation, Intérieur…"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => { if (newSpec.trim()) { setSpecialties((p) => [...p, newSpec.trim()]); setNewSpec(""); } }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {enabled && slug && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5">
          <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-800">Portfolio public actif</p>
            <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline truncate block">
              {portfolioUrl}
            </a>
          </div>
          <Eye className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      )}

      {!enabled && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
          <EyeOff className="h-4 w-4 text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500">Le portfolio est masqué. Activez-le pour le rendre public.</p>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
        Enregistrer le portfolio
      </Button>
    </div>
  );
}
