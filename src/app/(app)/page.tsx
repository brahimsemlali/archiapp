import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Users, FileText, Clock, Plus, ArrowRight } from "lucide-react";
import { formatRelative } from "@/lib/format";

const PHASE_COLORS: Record<string, string> = {
  esquisse: "bg-slate-100 text-slate-700",
  aps: "bg-blue-100 text-blue-700",
  apd: "bg-indigo-100 text-indigo-700",
  pc: "bg-purple-100 text-purple-700",
  dce: "bg-orange-100 text-orange-700",
  chantier: "bg-yellow-100 text-yellow-700",
  reception: "bg-green-100 text-green-700",
  termine: "bg-gray-100 text-gray-700",
};

const PHASE_LABELS: Record<string, string> = {
  esquisse: "Esquisse", aps: "APS", apd: "APD", pc: "PC",
  dce: "DCE", chantier: "Chantier", reception: "Réception", termine: "Terminé",
};

const ACTION_LABELS: Record<string, string> = {
  "client.created": "Nouveau client créé",
  "project.created": "Nouveau projet créé",
  "contract.generated": "Contrat généré",
  "file.uploaded": "Fichier déposé",
};

function activityLabel(action: string, metadata: Record<string, unknown>): string {
  const base = ACTION_LABELS[action] ?? action;
  const name = (metadata.name ?? metadata.title ?? metadata.filename) as string | undefined;
  return name ? `${base} : ${name}` : base;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: activeProjects },
    { count: clientsCount },
    { count: draftContracts },
    { data: recentActivity },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, phase, status, clients(name)")
      .is("archived_at", null)
      .neq("status", "termine")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null),
    supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .eq("status", "brouillon"),
    supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  // Phase distribution
  const phaseCounts: Record<string, number> = {};
  for (const p of activeProjects ?? []) {
    phaseCounts[p.phase] = (phaseCounts[p.phase] ?? 0) + 1;
  }

  const firstName = user?.email?.split("@")[0] ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Voici où en sont vos projets.</p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/projects">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projets actifs</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeProjects?.length ?? 0}</p>
              {Object.keys(phaseCounts).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(phaseCounts).map(([phase, count]) => (
                    <span
                      key={phase}
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PHASE_COLORS[phase] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {PHASE_LABELS[phase] ?? phase} {count}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{clientsCount ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contracts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contrats en brouillon</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{draftContracts ?? 0}</p>
              {(draftContracts ?? 0) > 0 && (
                <p className="text-xs text-amber-600 mt-1">À finaliser avant signature</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Projets récents</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Tous <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeProjects && activeProjects.length > 0 ? (
              activeProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{project.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(project.clients as unknown as { name: string } | null)?.name ?? "—"}
                      </p>
                    </div>
                    <span className={`shrink-0 ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_COLORS[project.phase] ?? "bg-gray-100 text-gray-700"}`}>
                      {PHASE_LABELS[project.phase] ?? project.phase}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">Aucun projet actif.</p>
                <Link href="/projects/new">
                  <Button variant="outline" size="sm">Créer un projet</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <ul className="space-y-3">
                {recentActivity.map((log) => (
                  <li key={log.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        {activityLabel(log.action, log.metadata as Record<string, unknown>)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelative(log.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
