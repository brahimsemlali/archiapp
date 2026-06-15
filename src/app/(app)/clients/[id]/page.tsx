import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Building2, Phone, Mail, MapPin, Edit, Plus, FileText, Receipt, BadgeDollarSign, TrendingUp, Globe } from "lucide-react";
import { ClientPortalShare, ClientPortalSharing, ArchitectReplyForm } from "@/components/portal/client-portal-actions";
import { formatMoney } from "@/lib/format";
import { getWorkspaceLocalization } from "@/lib/localization";
import { getServerFormatters } from "@/lib/formatters-server";
import { PHASE_COLORS } from "@/lib/constants";
import { getTranslations } from "next-intl/server";
import { getWorkspaceId } from "@/lib/workspace";
import { resolveVisibility, getPortalUpdates } from "@/lib/portal-sections";

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

const DEVIS_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé", expire: "Expiré",
};

const DEVIS_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  brouillon: "secondary", envoye: "outline", accepte: "default", refuse: "destructive", expire: "outline",
};

const FACTURE_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", envoyee: "Envoyée", payee: "Payée", annulee: "Annulée",
};

const FACTURE_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  brouillon: "secondary", envoyee: "outline", payee: "default", annulee: "destructive",
};

const ACTION_LABELS: Record<string, string> = {
  "client.created": "Client créé",
  "project.created": "Projet créé",
  "contract.generated": "Contrat généré",
  "file.uploaded": "Fichier déposé",
  "devis.created": "Devis créé",
  "facture.created": "Facture créée",
  "facture.paid": "Facture encaissée",
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
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();
  const { currency, timezone } = await getWorkspaceLocalization(supabase, workspaceId);
  const { formatDate, formatRelative } = await getServerFormatters(timezone);
  const tPhase = await getTranslations("phase");
  const money = (centimes: number) => formatMoney(centimes, currency);

  const [
    { data: client },
    { data: projects },
    { data: contracts },
    { data: activityLog },
    { data: devisList },
    { data: factures },
    { data: clientPortalLink },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).eq("workspace_id", workspaceId).single(),
    supabase
      .from("projects")
      .select("id, title, phase, status, created_at")
      .eq("workspace_id", workspaceId)
      .eq("client_id", id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, title, type, status, created_at")
      .eq("workspace_id", workspaceId)
      .eq("client_id", id)
      .neq("status", "archive")
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_log")
      .select("id, action, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("devis")
      .select("id, number, title, status, total_centimes, created_at")
      .eq("workspace_id", workspaceId)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("factures")
      .select("id, number, title, status, total_centimes, due_date, paid_at, created_at")
      .eq("workspace_id", workspaceId)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("share_links")
      .select("token, accessed_count, last_accessed_at")
      .eq("workspace_id", workspaceId)
      .eq("resource_type", "client")
      .eq("resource_id", id)
      .is("expires_at", null)
      .maybeSingle(),
  ]);

  const { data: portalMessages } = clientPortalLink
    ? await supabase
        .from("portal_messages")
        .select("id, sender, sender_name, body, created_at")
        .eq("workspace_id", workspaceId)
        .eq("client_id", id)
        .eq("share_token", clientPortalLink.token)
        .order("created_at", { ascending: true })
    : { data: [] };

  if (!client) notFound();

  // Financial summary
  const totalDevis = (devisList ?? []).filter((d) => d.status === "accepte").reduce((s, d) => s + d.total_centimes, 0);
  const totalInvoiced = (factures ?? []).filter((f) => f.status !== "annulee").reduce((s, f) => s + f.total_centimes, 0);
  const totalPaid = (factures ?? []).filter((f) => f.status === "payee").reduce((s, f) => s + f.total_centimes, 0);
  const totalOutstanding = (factures ?? []).filter((f) => f.status === "envoyee").reduce((s, f) => s + f.total_centimes, 0);

  const hasFinancials = totalInvoiced > 0 || totalDevis > 0;

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

      {/* Financial summary */}
      {hasFinancials && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-blue-800">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Résumé financier
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">Devis acceptés</p>
              <p className="text-lg font-bold">{totalDevis > 0 ? money(totalDevis) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Facturé</p>
              <p className="text-lg font-bold">{totalInvoiced > 0 ? money(totalInvoiced) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Encaissé</p>
              <p className="text-lg font-bold text-green-700">{totalPaid > 0 ? money(totalPaid) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className={`text-lg font-bold ${totalOutstanding > 0 ? "text-amber-700" : ""}`}>
                {totalOutstanding > 0 ? money(totalOutstanding) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">
            Projets {projects && projects.length > 0 ? `(${projects.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="contracts">
            Contrats {contracts && contracts.length > 0 ? `(${contracts.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="devis">
            Devis {devisList && devisList.length > 0 ? `(${devisList.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="factures">
            Factures {factures && factures.length > 0 ? `(${factures.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="portal" className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Portail
            {clientPortalLink && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </TabsTrigger>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_COLORS[project.phase] ?? "bg-gray-100 text-gray-700"}`}>
                      {tPhase.has(project.phase) ? tPhase(project.phase) : project.phase}
                    </span>
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

        <TabsContent value="devis" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Devis émis pour ce client</p>
            <Link href={`/devis/new?clientId=${id}`}>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau devis
              </Button>
            </Link>
          </div>
          {devisList && devisList.length > 0 ? (
            <div className="space-y-2">
              {devisList.map((d) => (
                <Link key={d.id} href={`/devis/${d.id}`}>
                  <div className="bg-white border rounded-lg p-3 flex items-center justify-between text-sm hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{d.number} — {d.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{money(d.total_centimes)}</span>
                      <Badge variant={DEVIS_STATUS_VARIANT[d.status] ?? "secondary"} className="text-xs">
                        {DEVIS_STATUS_LABELS[d.status] ?? d.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Aucun devis pour ce client.</p>
              <Link href={`/devis/new?clientId=${id}`}>
                <Button variant="outline" size="sm" className="mt-3">Créer un devis</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="factures" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Factures émises pour ce client</p>
            <Link href={`/factures/new?clientId=${id}`}>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle facture
              </Button>
            </Link>
          </div>
          {factures && factures.length > 0 ? (
            <div className="space-y-2">
              {factures.map((f) => {
                const isOverdue = f.status === "envoyee" && f.due_date && new Date(f.due_date) < new Date();
                return (
                  <Link key={f.id} href={`/factures/${f.id}`}>
                    <div className="bg-white border rounded-lg p-3 flex items-center justify-between text-sm hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <BadgeDollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{f.number} — {f.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(f.created_at)}
                            {isOverdue && <span className="ml-2 text-red-600 font-medium">En retard</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{money(f.total_centimes)}</span>
                        <Badge variant={FACTURE_STATUS_VARIANT[f.status] ?? "secondary"} className="text-xs">
                          {FACTURE_STATUS_LABELS[f.status] ?? f.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Aucune facture pour ce client.</p>
              <Link href={`/factures/new?clientId=${id}`}>
                <Button variant="outline" size="sm" className="mt-3">Créer une facture</Button>
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

        <TabsContent value="portal" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Portail client
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Partagez un lien sécurisé donnant accès au dossier complet : projets, contrats, devis, factures, comptes-rendus et historique de collaboration.
              </p>
            </CardHeader>
            <CardContent>
              <ClientPortalShare
                clientId={id}
                existingUrl={clientPortalLink ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/portal/client/${clientPortalLink.token}` : null}
                lastAccessedAt={clientPortalLink?.last_accessed_at ?? null}
                accessCount={clientPortalLink?.accessed_count ?? 0}
              />
            </CardContent>
          </Card>

          {clientPortalLink && (
            <ClientPortalSharing
              clientId={id}
              initialVisibility={resolveVisibility(client.metadata)}
              initialUpdates={getPortalUpdates(client.metadata)}
            />
          )}

          {clientPortalLink && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Discussion avec le client</CardTitle>
                <p className="text-sm text-muted-foreground">Messages échangés via le portail client.</p>
              </CardHeader>
              <CardContent>
                <ArchitectReplyForm
                  clientId={id}
                  messages={portalMessages ?? []}
                  firmName={null}
                />
              </CardContent>
            </Card>
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
