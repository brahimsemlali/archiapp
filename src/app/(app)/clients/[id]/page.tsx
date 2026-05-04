import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User, Building2, Phone, Mail, MapPin, Edit, Plus, FileText } from "lucide-react";
import { formatDate, formatRelative } from "@/lib/format";

const PHASE_LABELS: Record<string, string> = {
  esquisse: "Esquisse", aps: "APS", apd: "APD", pc: "PC",
  dce: "DCE", chantier: "Chantier", reception: "Réception", termine: "Terminé",
};

const CONTRACT_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  brouillon: "secondary",
  finalise: "default",
  archive: "outline",
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  finalise: "Finalisé",
  archive: "Archivé",
};

const ACTION_LABELS: Record<string, string> = {
  "client.created": "Client créé",
  "project.created": "Projet créé",
  "contract.generated": "Contrat généré",
  "file.uploaded": "Fichier déposé",
};

function activityLabel(action: string, metadata: Record<string, unknown>): string {
  const base = ACTION_LABELS[action] ?? action;
  const name = (metadata.name ?? metadata.title ?? metadata.filename) as string | undefined;
  return name ? `${base} : ${name}` : base;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: projects }, { data: contracts }, { data: activityLog }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase
        .from("projects")
        .select("id, title, phase, status, created_at")
        .eq("client_id", id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("contracts")
        .select("id, title, type, status, created_at")
        .eq("client_id", id)
        .neq("status", "archive")
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_log")
        .select("id, action, metadata, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {client.type === "societe" ? (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant={client.type === "societe" ? "default" : "secondary"}>
              {client.type === "societe" ? "Société" : "Particulier"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Client depuis {formatDate(client.created_at)}
          </p>
        </div>
        <Link href={`/clients/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {client.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
          </div>
        )}
        {client.address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{client.address}</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">
            Projets {projects && projects.length > 0 ? `(${projects.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="contracts">
            Contrats {contracts && contracts.length > 0 ? `(${contracts.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Projets de ce client</p>
            <Link href={`/projects/new?clientId=${id}`}>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau projet
              </Button>
            </Link>
          </div>
          {projects && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{project.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(project.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">{PHASE_LABELS[project.phase] ?? project.phase}</Badge>
                      <Badge variant="secondary" className="text-xs">{project.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Aucun projet associé à ce client.</p>
              <Link href={`/projects/new?clientId=${id}`}>
                <Button variant="outline" size="sm" className="mt-3">Créer un projet</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Contrats de ce client</p>
            <Link href={`/contracts/new?clientId=${id}`}>
              <Button size="sm" variant="outline">
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
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{contract.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(contract.created_at)}</p>
                      </div>
                    </div>
                    <Badge
                      variant={CONTRACT_STATUS_VARIANT[contract.status] ?? "secondary"}
                      className="text-xs"
                    >
                      {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Aucun contrat pour ce client.</p>
              <Link href={`/contracts/new?clientId=${id}`}>
                <Button variant="outline" size="sm" className="mt-3">Générer un contrat</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {activityLog && activityLog.length > 0 ? (
            <ul className="space-y-3">
              {activityLog.map((log) => (
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
            <p className="text-sm text-muted-foreground text-center py-10">
              Aucune activité enregistrée pour ce client.
            </p>
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3 text-sm">
              {client.ice && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16">ICE</span>
                  <span>{client.ice}</span>
                </div>
              )}
              {client.cin && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16">CIN</span>
                  <span>{client.cin}</span>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
              {!client.ice && !client.cin && !client.notes && (
                <p className="text-muted-foreground">Aucune information complémentaire.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
