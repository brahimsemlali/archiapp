import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen } from "lucide-react";
import { formatDate } from "@/lib/format";

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

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  en_attente: "En attente",
  suspendu: "Suspendu",
  termine: "Terminé",
  archive: "Archivé",
};

const PHASE_LABELS: Record<string, string> = {
  esquisse: "Esquisse",
  aps: "APS",
  apd: "APD",
  pc: "PC",
  dce: "DCE",
  chantier: "Chantier",
  reception: "Réception",
  termine: "Terminé",
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projets</h1>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {(project.clients as { name: string } | null)?.name ?? "—"} · {formatDate(project.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_COLORS[project.phase] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {PHASE_LABELS[project.phase] ?? project.phase}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {STATUS_LABELS[project.status] ?? project.status}
                    </Badge>
                  </div>
                </div>
                {project.address && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">{project.address}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun projet pour l'instant.</p>
          <Link href="/projects/new">
            <Button variant="outline" className="mt-4">Créer le premier projet</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
