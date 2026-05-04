import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, HardHat, Camera, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Observation } from "@/lib/actions/visites";
import Image from "next/image";

export default async function VisitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: visites }] = await Promise.all([
    supabase.from("projects").select("id, title").eq("id", id).single(),
    supabase
      .from("site_visits")
      .select("id, title, visit_date, weather, attendees, observations, summary, ai_generated, created_at")
      .eq("project_id", id)
      .order("visit_date", { ascending: false }),
  ]);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Visites de chantier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{project.title}</p>
        </div>
        <Link href={`/projects/${id}/visites/new`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle visite
          </Button>
        </Link>
      </div>

      {visites && visites.length > 0 ? (
        <div className="space-y-4">
          {visites.map((v) => {
            const obs = v.observations as Observation[];
            const photos = obs.filter((o) => o.photoUrl);
            return (
              <div key={v.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <HardHat className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="font-semibold">{v.title}</p>
                        {v.ai_generated && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> IA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(v.visit_date)}
                        {v.weather && ` · ${v.weather}`}
                        {v.attendees && ` · ${v.attendees}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{obs.length} obs.</span>
                  </div>

                  {/* Photo strip */}
                  {photos.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {photos.slice(0, 5).map((o) => (
                        <Image
                          key={o.id}
                          src={o.photoUrl!}
                          alt={o.zone}
                          width={80}
                          height={80}
                          className="h-16 w-16 object-cover rounded-lg border shrink-0"
                        />
                      ))}
                      {photos.length > 5 && (
                        <div className="h-16 w-16 rounded-lg border bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-xs text-muted-foreground">+{photos.length - 5}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observations list */}
                  <div className="mt-3 space-y-1.5">
                    {obs.slice(0, 3).map((o) => (
                      <div key={o.id} className="flex items-start gap-2 text-sm">
                        <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{o.zone}</span>
                        <p className="text-sm text-gray-700 line-clamp-2">{o.note}</p>
                      </div>
                    ))}
                    {obs.length > 3 && (
                      <p className="text-xs text-muted-foreground">+ {obs.length - 3} autres observations</p>
                    )}
                  </div>

                  {/* Summary */}
                  {v.summary && (
                    <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <p className="text-xs text-purple-600 font-medium mb-1">Synthèse IA</p>
                      <p className="text-sm text-gray-700 line-clamp-3">{v.summary}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <HardHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucune visite enregistrée</p>
          <p className="text-xs mt-1 mb-4">Documentez vos visites de chantier avec photos et observations</p>
          <Link href={`/projects/${id}/visites/new`}>
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Première visite
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
