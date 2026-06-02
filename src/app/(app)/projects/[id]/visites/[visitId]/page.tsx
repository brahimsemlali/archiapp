import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, HardHat, Sparkles, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { Observation } from "@/lib/actions/visites";
import Image from "next/image";
import { DeleteVisiteButton } from "@/components/visites/delete-visite-button";
import { PrintButton } from "@/components/visites/print-button";
import { getWorkspaceId } from "@/lib/workspace";

async function signObservationPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  observations: Observation[]
): Promise<Observation[]> {
  return Promise.all(
    observations.map(async (observation) => {
      if (!observation.photoPath) return observation;
      const { data } = await supabase.storage.from("project-files").createSignedUrl(observation.photoPath, 60 * 60);
      return { ...observation, photoUrl: data?.signedUrl };
    })
  );
}

export default async function VisiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id, visitId } = await params;
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();

  const [{ data: project }, { data: visite }, { data: firmProfile }, { data: siteIssues }] = await Promise.all([
    supabase.from("projects").select("id, title, workspace_id").eq("id", id).eq("workspace_id", workspaceId).single(),
    supabase
      .from("site_visits")
      .select("*")
      .eq("id", visitId)
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .single(),
    supabase
      .from("firm_profile")
      .select("firm_name, architect_name, logo_url")
      .eq("workspace_id", workspaceId)
      .single(),
    supabase
      .from("site_issues")
      .select("id, title, description, zone, status, priority, due_date")
      .eq("workspace_id", workspaceId)
      .eq("site_visit_id", visitId)
      .order("created_at", { ascending: false }),
  ]);

  if (!project || !visite) notFound();

  const observations = await signObservationPhotos(supabase, visite.observations as Observation[]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 print:hidden">
        <Link href={`/projects/${id}/visites`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{visite.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{project.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <DeleteVisiteButton visitId={visitId} projectId={id} />
        </div>
      </div>

      {/* Printable document */}
      <div className="bg-white border rounded-xl shadow-sm print:shadow-none print:border-none print:rounded-none">
        {/* Print header */}
        <div className="hidden print:flex justify-between items-start px-8 pt-8 pb-4 border-b">
          <div>
            <p className="text-base font-bold">{firmProfile?.firm_name ?? "Cabinet d'architecture"}</p>
            {firmProfile?.architect_name && <p className="text-sm text-gray-500">{firmProfile.architect_name}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-600">COMPTE-RENDU DE VISITE</p>
            <p className="text-xs text-gray-400">{project.title}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Meta info */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
              <HardHat className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-medium text-amber-800">{formatDate(visite.visit_date)}</span>
            </div>
            {visite.weather && (
              <Badge variant="outline" className="text-xs">{visite.weather}</Badge>
            )}
            {visite.ai_generated && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs gap-1">
                <Sparkles className="h-3 w-3" />Synthèse IA
              </Badge>
            )}
          </div>

          {visite.attendees && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Présents</p>
              <p className="text-sm">{visite.attendees}</p>
            </div>
          )}

          {siteIssues && siteIssues.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Réserves créées ({siteIssues.length})
              </p>
              <div className="space-y-2">
                {siteIssues.map((issue) => (
                  <div key={issue.id} className="rounded-lg bg-white/80 border border-amber-100 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">
                        {issue.status === "open" ? "Ouverte" : issue.status === "in_progress" ? "En cours" : "Résolue"}
                      </Badge>
                      <Badge variant={issue.priority === "high" ? "destructive" : "secondary"} className="text-[11px]">
                        {issue.priority === "high" ? "Haute" : issue.priority === "medium" ? "Moyenne" : "Basse"}
                      </Badge>
                      {issue.zone && <span className="text-xs text-amber-700">{issue.zone}</span>}
                    </div>
                    <p className="mt-2 font-medium text-gray-800">{issue.title}</p>
                    {issue.description && <p className="mt-1 text-gray-600">{issue.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {visite.summary && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-2">Synthèse IA</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{visite.summary}</p>
            </div>
          )}

          {/* Observations */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
              Observations ({observations.length})
            </p>
            <div className="space-y-4">
              {observations.map((obs, idx) => (
                <div key={obs.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b">
                    <span className="text-xs text-muted-foreground font-mono">{idx + 1}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{obs.zone}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{obs.note}</p>
                    {obs.photoUrl && (
                      <div className="mt-3">
                        <Image
                          src={obs.photoUrl}
                          alt={obs.zone}
                          width={400}
                          height={300}
                          className="rounded-lg border object-cover max-h-64 w-auto print:max-h-48"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo gallery summary */}
          {observations.some((o) => o.photoUrl) && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3 flex items-center gap-2">
                <Camera className="h-3 w-3" />
                Photos ({observations.filter((o) => o.photoUrl).length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {observations
                  .filter((o) => o.photoUrl)
                  .map((o) => (
                    <Image
                      key={o.id}
                      src={o.photoUrl!}
                      alt={o.zone}
                      width={160}
                      height={160}
                      className="h-24 w-full object-cover rounded-lg border"
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Print footer */}
          <div className="hidden print:block pt-6 border-t text-xs text-gray-400 text-center">
            Compte-rendu généré via ArchiDesk · {firmProfile?.firm_name}
          </div>
        </div>
      </div>
    </div>
  );
}
