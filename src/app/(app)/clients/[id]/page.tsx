import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Building2, Phone, Mail, MapPin, Edit } from "lucide-react";
import { formatDate } from "@/lib/format";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: projects }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("projects")
      .select("id, title, phase, status, created_at")
      .eq("client_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
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
          <TabsTrigger value="projects">Projets</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
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
                      <Badge variant="outline" className="text-xs">{project.phase}</Badge>
                      <Badge variant="secondary" className="text-xs">{project.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun projet associé.</p>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
