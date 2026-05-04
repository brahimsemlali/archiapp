import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit, MapPin, Ruler, Calendar, Plus } from "lucide-react";
import { formatDate, formatMAD } from "@/lib/format";

const PHASE_LABELS: Record<string, string> = {
  esquisse: "Esquisse", aps: "APS", apd: "APD", pc: "PC",
  dce: "DCE", chantier: "Chantier", reception: "Réception", termine: "Terminé",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: contracts }, { data: files }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients(id, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("contracts")
      .select("id, title, type, status, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("files")
      .select("id, filename, folder, size_bytes, created_at, version")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!project) notFound();

  const client = project.clients as { id: string; name: string } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
              {client && (
                <Link href={`/clients/${client.id}`} className="text-sm text-muted-foreground hover:underline">
                  {client.name}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{PHASE_LABELS[project.phase] ?? project.phase}</Badge>
              <Link href={`/projects/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {project.address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{project.address}</span>
          </div>
        )}
        {project.surface_m2 && (
          <div className="flex items-center gap-2 text-sm">
            <Ruler className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{project.surface_m2} m²</span>
          </div>
        )}
        {project.start_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatDate(project.start_date)}</span>
          </div>
        )}
        {project.fees_centimes && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Honoraires:</span>
            <span className="font-medium">{formatMAD(project.fees_centimes)}</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="files">Fichiers ({files?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contracts">Contrats ({contracts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-3">Informations</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize">{project.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase</span>
                  <span>{PHASE_LABELS[project.phase] ?? project.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <span>{project.status}</span>
                </div>
                {project.budget_estimate_centimes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget estimé</span>
                    <span>{formatMAD(project.budget_estimate_centimes)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            {project.notes && (
              <Card>
                <CardContent className="pt-6 text-sm">
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-3">Notes</p>
                  <p className="whitespace-pre-wrap text-sm">{project.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Fichiers du projet</p>
            <Link href={`/projects/${id}/files`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Gérer les fichiers
              </Button>
            </Link>
          </div>
          {files && files.length > 0 ? (
            <div className="space-y-2">
              {files.slice(0, 5).map((file) => (
                <div key={file.id} className="bg-white border rounded-lg p-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">{file.folder} · v{file.version}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(file.created_at)}</span>
                </div>
              ))}
              {files.length > 5 && (
                <Link href={`/projects/${id}/files`} className="text-sm text-primary hover:underline block text-center pt-2">
                  Voir tous les fichiers ({files.length})
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun fichier déposé.</p>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Contrats du projet</p>
            <Link href={`/contracts/new?projectId=${id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau contrat
              </Button>
            </Link>
          </div>
          {contracts && contracts.length > 0 ? (
            <div className="space-y-2">
              {contracts.map((contract) => (
                <Link key={contract.id} href={`/contracts/${contract.id}`}>
                  <div className="bg-white border rounded-lg p-3 flex items-center justify-between text-sm hover:shadow-sm transition-shadow">
                    <div>
                      <p className="font-medium">{contract.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(contract.created_at)}</p>
                    </div>
                    <Badge variant={contract.status === "finalise" ? "default" : "secondary"} className="text-xs">
                      {contract.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun contrat.</p>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Bloc-notes Markdown du projet</p>
            <Link href={`/projects/${id}/notes`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ouvrir l'éditeur
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="pt-6">
              {project.notes ? (
                <pre className="whitespace-pre-wrap text-sm font-sans">{project.notes.slice(0, 300)}{project.notes.length > 300 ? "…" : ""}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune note pour l'instant.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
