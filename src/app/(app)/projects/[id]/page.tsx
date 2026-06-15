import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, MapPin, Ruler, Calendar, Plus, Receipt, BadgeDollarSign, TrendingUp, ListTodo } from "lucide-react";
import { SharePortalButton } from "@/components/projects/share-portal-button";
import { formatMoney } from "@/lib/format";
import { getWorkspaceLocalization } from "@/lib/localization";
import { getServerFormatters } from "@/lib/formatters-server";
import { PhaseChecklist } from "@/components/projects/phase-checklist";
import { InspirationBoard } from "@/components/projects/inspiration-board";
import type { InspirationItem } from "@/components/projects/inspiration-board";
import { PermitTracker } from "@/components/projects/permit-tracker";
import { CommentsSection } from "@/components/comments/comments-section";
import { AiSummaryButton } from "@/components/projects/ai-summary-button";
import { ProjectHealthCard } from "@/components/projects/project-health-card";
import { SiteIssuesPanel, type SiteIssueRow } from "@/components/projects/site-issues-panel";
import { BoqManager, type BoqItemRow } from "@/components/boq/boq-manager";
import { MeetingIntelligencePanel } from "@/components/projects/meeting-intelligence-panel";
import { PhaseBudgetPlanner, type PhaseBudgetMap } from "@/components/projects/phase-budget-planner";
import { getTranslations } from "next-intl/server";
import { getPlanLimits } from "@/lib/billing/plans";
import { signInspirationItems } from "@/lib/storage/signed-images";

const ACTION_LABELS: Record<string, string> = {
  "project.created": "Projet créé",
  "contract.generated": "Contrat généré",
  "file.uploaded": "Fichier déposé",
  "file.deleted": "Fichier supprimé",
  "devis.created": "Devis créé",
  "facture.created": "Facture créée",
  "facture.paid": "Facture encaissée",
  "visite.created": "Visite de chantier enregistrée",
  "boq.item_created": "Article BOQ ajouté",
  "meeting.summary_generated": "Résumé de réunion généré",
  "project.phase_budgets_updated": "Budgets par phase mis à jour",
};

const PROJECT_TABS = new Set([
  "overview",
  "files",
  "contracts",
  "devis",
  "factures",
  "livrables",
  "inspirations",
  "permis",
  "notes",
  "visites",
  "reserves",
  "boq",
  "meetings",
  "discussion",
  "rentabilite",
]);

function activityLabel(action: string, metadata: Record<string, unknown>): string {
  const base = ACTION_LABELS[action] ?? action;
  const name = (metadata.title ?? metadata.filename) as string | undefined;
  return name ? `${base} : ${name}` : base;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams ?? Promise.resolve({} as { tab?: string })]);
  const initialTab = query.tab && PROJECT_TABS.has(query.tab) ? query.tab : "overview";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const workspaceId = await getWorkspaceId(supabase, user?.id);
  if (!workspaceId) notFound();
  const { currency, timezone } = await getWorkspaceLocalization(supabase, workspaceId);
  const { formatDate, formatRelative } = await getServerFormatters(timezone);
  const tPhase = await getTranslations("phase");
  const tStatus = await getTranslations("status.project");
  const money = (centimes: number) => formatMoney(centimes, currency);
  const { data: workspace } = await supabase.from("workspaces").select("plan").eq("id", workspaceId).single();
  const aiEnabled = getPlanLimits(workspace?.plan).aiEnabled;

  const [{ data: project }, { data: contracts }, { data: files }, { data: activityLog }, { data: portalLink }, { data: devisList }, { data: facturesList }, { data: permitStages }, { data: comments }, { data: timeEntries }, { data: siteIssues }, { data: projectTasks }, { data: members }, { data: boqItems }, { data: suppliers }, { data: meetingNotes }, { data: carryoverTasks }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients!projects_client_id_fkey(id, name), metadata")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single(),
    supabase
      .from("contracts")
      .select("id, title, type, status, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("files")
      .select("id, filename, folder, size_bytes, created_at, version, approval_status")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("activity_log")
      .select("id, action, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("share_links")
      .select("token")
      .eq("workspace_id", workspaceId)
      .eq("resource_id", id)
      .eq("resource_type", "project")
      .maybeSingle(),
    supabase
      .from("devis")
      .select("id, number, title, status, total_centimes, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("factures")
      .select("id, number, title, status, total_centimes, due_date, paid_at, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("permit_stages")
      .select("id, project_id, stage, status, deadline, docs, notes, completed_at, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id),
    supabase
      .from("comments")
      .select("id, body, author_id, created_at")
      .eq("workspace_id", workspaceId)
      .eq("resource_type", "project")
      .eq("resource_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("time_entries")
      .select("id, duration_minutes, rate_centimes, billable, phase, description, date")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("date", { ascending: false }),
    supabase
      .from("site_issues")
      .select("id, project_id, site_visit_id, assigned_to, title, description, zone, status, priority, due_date, photo_url, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, status")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .is("archived_at", null),
    supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId),
    supabase
      .from("boq_items")
      .select("id, project_id, supplier_id, item_name, category, quantity, unit, estimated_cost_centimes, actual_cost_centimes, procurement_status, notes, projects!boq_items_project_id_fkey(title), suppliers!boq_items_supplier_id_fkey(name)")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("meeting_notes")
      .select("id, title, meeting_date, meeting_type, attendees, duration_planned_minutes, duration_actual_minutes, summary, decisions, risks, extracted_tasks, ai_generated, pv_signed_at, pv_signer_name, metadata")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .order("meeting_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority")
      .eq("workspace_id", workspaceId)
      .eq("project_id", id)
      .neq("status", "termine")
      .is("archived_at", null)
      .contains("metadata", { source: "meeting_notes" })
      .order("due_date", { ascending: true }),
  ]);

  if (!project) notFound();

  const client = project.clients as { id: string; name: string } | null;
  const projectMetadata = (project.metadata as Record<string, unknown>) ?? {};
  const phaseBudgets = (projectMetadata.phase_budgets as PhaseBudgetMap | undefined) ?? {};

  const totalDevisAccepted = (devisList ?? []).filter((d) => d.status === "accepte").reduce((s, d) => s + d.total_centimes, 0);
  const totalInvoiced = (facturesList ?? []).filter((f) => f.status !== "annulee").reduce((s, f) => s + f.total_centimes, 0);
  const totalPaid = (facturesList ?? []).filter((f) => f.status === "payee").reduce((s, f) => s + f.total_centimes, 0);
  const totalOutstanding = (facturesList ?? []).filter((f) => f.status === "envoyee").reduce((s, f) => s + f.total_centimes, 0);

  const allEntries = timeEntries ?? [];
  const totalMinutes = allEntries.reduce((s, e) => s + e.duration_minutes, 0);
  const billableMinutes = allEntries.filter((e) => e.billable).reduce((s, e) => s + e.duration_minutes, 0);
  const timeCostCentimes = allEntries.reduce((s, e) => {
    const rate = e.rate_centimes ?? 0;
    return s + Math.round((e.duration_minutes / 60) * rate);
  }, 0);
  const phaseActuals = allEntries.map((entry) => ({
    phase: entry.phase,
    minutes: entry.duration_minutes,
    costCentimes: Math.round((entry.duration_minutes / 60) * (entry.rate_centimes ?? 0)),
  }));
  const hasRates = allEntries.some((e) => (e.rate_centimes ?? 0) > 0);
  const grossMarginCentimes = hasRates ? totalPaid - timeCostCentimes : null;
  const marginPct = grossMarginCentimes !== null && totalPaid > 0
    ? Math.round((grossMarginCentimes / totalPaid) * 100)
    : null;
  const billingRatePct = project.fees_centimes && project.fees_centimes > 0 && totalInvoiced > 0
    ? Math.round((totalInvoiced / project.fees_centimes) * 100)
    : null;
  const collectionRatePct = totalInvoiced > 0
    ? Math.round((totalPaid / totalInvoiced) * 100)
    : null;
  const openIssues = (siteIssues ?? []).filter((issue) => issue.status !== "resolved");
  const highIssuesCount = openIssues.filter((issue) => issue.priority === "high").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasksCount = (projectTasks ?? []).filter((task) => task.status !== "termine" && task.due_date && task.due_date < todayStr).length;
  const currentMemberRole = (members ?? []).find((member) => member.user_id === user?.id)?.role;
  const canModerateComments = currentMemberRole === "owner" || currentMemberRole === "admin";
  const inspirationItems = await signInspirationItems(
    supabase,
    (projectMetadata.inspirations as InspirationItem[]) ?? []
  );

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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{tPhase.has(project.phase) ? tPhase(project.phase) : project.phase}</Badge>
              <SharePortalButton
                projectId={id}
                existingToken={portalLink?.token ?? null}
              />
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
            <span className="font-medium">{money(project.fees_centimes)}</span>
          </div>
        )}
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="files">Fichiers ({files?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contracts">Contrats ({contracts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="devis">Devis ({devisList?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="factures">Factures ({facturesList?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="livrables">Livrables</TabsTrigger>
          <TabsTrigger value="inspirations">Inspirations</TabsTrigger>
          <TabsTrigger value="permis">Permis de construire</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="visites">Chantier</TabsTrigger>
          <TabsTrigger value="reserves">Réserves ({openIssues.length})</TabsTrigger>
          <TabsTrigger value="boq">BOQ ({boqItems?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="meetings">Réunions ({meetingNotes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="discussion">Discussion ({comments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="rentabilite">Rentabilité</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <AiSummaryButton projectId={id} aiEnabled={aiEnabled} />
          </div>
          <ProjectHealthCard
            budgetEstimateCentimes={project.budget_estimate_centimes ?? null}
            feesCentimes={project.fees_centimes ?? null}
            totalInvoicedCentimes={totalInvoiced}
            totalPaidCentimes={totalPaid}
            timeCostCentimes={timeCostCentimes}
            targetEndDate={project.target_end_date ?? null}
            status={project.status}
            openIssuesCount={openIssues.length}
            highIssuesCount={highIssuesCount}
            overdueTasksCount={overdueTasksCount}
          />
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
                  <span>{tPhase.has(project.phase) ? tPhase(project.phase) : project.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <span>{tStatus.has(project.status) ? tStatus(project.status) : project.status}</span>
                </div>
                {project.budget_estimate_centimes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget estimé</span>
                    <span>{money(project.budget_estimate_centimes)}</span>
                  </div>
                )}
                {project.target_end_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin prévue</span>
                    <span>{formatDate(project.target_end_date)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-sm">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-3">Activité récente</p>
                {activityLog && activityLog.length > 0 ? (
                  <ul className="space-y-2.5">
                    {activityLog.map((log) => (
                      <li key={log.id} className="flex items-start gap-2.5">
                        <div className="h-1.5 w-1.5 mt-1.5 rounded-full bg-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm leading-snug">
                            {activityLabel(log.action, log.metadata as Record<string, unknown>)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelative(log.created_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">Aucune activité enregistrée.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {(totalInvoiced > 0 || (devisList && devisList.length > 0)) && (
            <Card className="border-blue-100 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-blue-800">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Résumé financier
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-0">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3" /> Devis acceptés</p>
                  <p className="text-lg font-bold mt-0.5">{totalDevisAccepted > 0 ? money(totalDevisAccepted) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><BadgeDollarSign className="h-3 w-3" /> Facturé</p>
                  <p className="text-lg font-bold mt-0.5">{totalInvoiced > 0 ? money(totalInvoiced) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Encaissé</p>
                  <p className="text-lg font-bold text-green-700 mt-0.5">{totalPaid > 0 ? money(totalPaid) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">En attente</p>
                  <p className={`text-lg font-bold mt-0.5 ${totalOutstanding > 0 ? "text-amber-700" : ""}`}>
                    {totalOutstanding > 0 ? money(totalOutstanding) : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {projectTasks && projectTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ListTodo className="h-4 w-4 text-primary" />
                  Tâches du projet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {projectTasks.slice(0, 6).map((task) => (
                  <Link key={task.id} href="/tasks" className="block">
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm transition-shadow hover:shadow-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{task.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {task.due_date ? formatDate(task.due_date) : "Sans échéance"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={task.priority === "haute" ? "destructive" : "secondary"} className="text-[10px]">
                          {task.priority}
                        </Badge>
                        <Badge variant={task.status === "termine" ? "default" : "outline"} className="text-[10px]">
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
                {projectTasks.length > 6 && (
                  <Link href="/tasks" className="block pt-1 text-center text-sm text-primary hover:underline">
                    Voir toutes les tâches ({projectTasks.length})
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {project.notes && (
            <Card>
              <CardContent className="pt-6 text-sm">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-3">Notes</p>
                <p className="whitespace-pre-wrap text-sm">{project.notes.slice(0, 400)}{project.notes.length > 400 ? "…" : ""}</p>
                <Link href={`/projects/${id}/notes`} className="text-xs text-primary hover:underline mt-2 inline-block">
                  Ouvrir l'éditeur de notes →
                </Link>
              </CardContent>
            </Card>
          )}
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

        <TabsContent value="devis" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Devis du projet</p>
            <Link href={`/devis/new?projectId=${id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau devis
              </Button>
            </Link>
          </div>
          {devisList && devisList.length > 0 ? (
            <div className="space-y-2">
              {devisList.map((d) => {
                const DEVIS_STATUS: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé", expire: "Expiré" };
                return (
                  <Link key={d.id} href={`/devis/${d.id}`}>
                    <div className="bg-white border rounded-lg p-3 flex items-center justify-between text-sm hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 min-w-0">
                        <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">{d.number}</span>
                            <p className="font-medium">{d.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold">{money(d.total_centimes)}</span>
                        <Badge variant={d.status === "accepte" ? "default" : d.status === "refuse" ? "destructive" : "secondary"}>
                          {DEVIS_STATUS[d.status] ?? d.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun devis pour ce projet.</p>
          )}
        </TabsContent>

        <TabsContent value="factures" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Factures du projet</p>
            <Link href={`/factures/new?projectId=${id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle facture
              </Button>
            </Link>
          </div>
          {facturesList && facturesList.length > 0 ? (
            <div className="space-y-2">
              {facturesList.map((f) => {
                const FACTURE_STATUS: Record<string, string> = { brouillon: "Brouillon", envoyee: "Envoyée", payee: "Payée", annulee: "Annulée" };
                const isOverdue = f.status === "envoyee" && f.due_date && new Date(f.due_date) < new Date();
                return (
                  <Link key={f.id} href={`/factures/${f.id}`}>
                    <div className={`bg-white border rounded-lg p-3 flex items-center justify-between text-sm hover:shadow-sm transition-shadow ${isOverdue ? "border-red-200 bg-red-50/30" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <BadgeDollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">{f.number}</span>
                            <p className="font-medium">{f.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(f.created_at)}
                            {isOverdue && <span className="text-red-500 font-medium"> · En retard</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold">{money(f.total_centimes)}</span>
                        <Badge variant={f.status === "payee" ? "default" : f.status === "annulee" ? "destructive" : "secondary"}>
                          {FACTURE_STATUS[f.status] ?? f.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune facture pour ce projet.</p>
          )}
        </TabsContent>

        <TabsContent value="livrables" className="mt-4">
          <PhaseChecklist
            projectId={id}
            phase={project.phase}
            initialChecklist={((project.metadata as Record<string, unknown>)?.checklist as Record<string, { label: string; done: boolean }[]>) ?? {}}
          />
        </TabsContent>

        <TabsContent value="inspirations" className="mt-4">
          <InspirationBoard
            projectId={id}
            initialItems={inspirationItems}
          />
        </TabsContent>

        <TabsContent value="permis" className="mt-4">
          <PermitTracker
            projectId={id}
            initialStages={(permitStages ?? []) as Parameters<typeof PermitTracker>[0]["initialStages"]}
          />
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

        <TabsContent value="visites" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Comptes-rendus de visite de chantier</p>
            <Link href={`/projects/${id}/visites/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle visite
              </Button>
            </Link>
          </div>
          <Link href={`/projects/${id}/visites`} className="block">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center hover:shadow-sm transition-shadow">
              <p className="text-sm font-medium text-amber-800">Voir toutes les visites de chantier</p>
              <p className="text-xs text-amber-600 mt-1">Photos, observations, synthèse IA</p>
            </div>
          </Link>
        </TabsContent>

        <TabsContent value="reserves" className="mt-4">
          <SiteIssuesPanel
            projectId={id}
            issues={(siteIssues ?? []) as SiteIssueRow[]}
            members={(members ?? []).map((member) => ({
              userId: member.user_id,
              role: member.role,
            }))}
          />
        </TabsContent>

        <TabsContent value="boq" className="mt-4">
          <BoqManager
            items={(boqItems ?? []) as unknown as BoqItemRow[]}
            projects={[{ id, title: project.title }]}
            suppliers={suppliers ?? []}
            defaultProjectId={id}
          />
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <MeetingIntelligencePanel
            projectId={id}
            meetings={(meetingNotes ?? []) as Parameters<typeof MeetingIntelligencePanel>[0]["meetings"]}
            carryoverTasks={(carryoverTasks ?? []) as Parameters<typeof MeetingIntelligencePanel>[0]["carryoverTasks"]}
            aiEnabled={aiEnabled}
          />
        </TabsContent>

        <TabsContent value="rentabilite" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Honoraires */}
            <Card>
              <CardContent className="pt-5 space-y-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Honoraires & facturation</p>
                {project.fees_centimes ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Honoraires contractés</span>
                    <span className="font-semibold">{money(project.fees_centimes)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Honoraires non renseignés</p>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Devis acceptés</span>
                  <span className="font-medium">{totalDevisAccepted > 0 ? money(totalDevisAccepted) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facturé</span>
                  <span className="font-medium">{totalInvoiced > 0 ? money(totalInvoiced) : "—"}</span>
                </div>
                {billingRatePct !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taux de facturation</span>
                    <span className={`font-semibold ${billingRatePct >= 90 ? "text-green-700" : billingRatePct >= 60 ? "text-amber-700" : "text-red-600"}`}>{billingRatePct}%</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-muted-foreground">Encaissé</span>
                  <span className="font-bold text-green-700">{totalPaid > 0 ? money(totalPaid) : "—"}</span>
                </div>
                {collectionRatePct !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taux d'encaissement</span>
                    <span className={`font-semibold ${collectionRatePct >= 80 ? "text-green-700" : "text-amber-700"}`}>{collectionRatePct}%</span>
                  </div>
                )}
                {totalOutstanding > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">En attente</span>
                    <span className="font-medium text-amber-700">{money(totalOutstanding)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Temps */}
            <Card>
              <CardContent className="pt-5 space-y-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Temps passé</p>
                {allEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucune entrée de temps enregistrée.</p>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{Math.floor(totalMinutes / 60)}h{totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}m` : ""}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Facturable</span>
                      <span className="font-medium">{Math.floor(billableMinutes / 60)}h{billableMinutes % 60 > 0 ? ` ${billableMinutes % 60}m` : ""}</span>
                    </div>
                    {hasRates && (
                      <div className="flex justify-between border-t pt-3">
                        <span className="text-muted-foreground">Coût estimé (temps)</span>
                        <span className="font-semibold text-red-700">{money(timeCostCentimes)}</span>
                      </div>
                    )}
                    {!hasRates && (
                      <p className="text-xs text-muted-foreground italic pt-1">Configurez un taux horaire dans les entrées de temps pour calculer les coûts.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Marge */}
            <Card className={grossMarginCentimes !== null ? (grossMarginCentimes >= 0 ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30") : ""}>
              <CardContent className="pt-5 space-y-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rentabilité</p>
                {grossMarginCentimes !== null ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Encaissé</span>
                      <span className="font-medium">{money(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coût temps</span>
                      <span className="font-medium text-red-700">- {money(timeCostCentimes)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-semibold">Marge brute</span>
                      <span className={`font-bold text-base ${grossMarginCentimes >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {money(grossMarginCentimes)}
                      </span>
                    </div>
                    {marginPct !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taux de marge</span>
                        <span className={`font-bold text-lg ${marginPct >= 30 ? "text-green-700" : marginPct >= 10 ? "text-amber-700" : "text-red-700"}`}>
                          {marginPct}%
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    {allEntries.length === 0
                      ? "Enregistrez du temps avec un taux horaire pour calculer la marge."
                      : "Configurez un taux horaire dans les entrées de temps."}
                  </p>
                )}
                {project.budget_estimate_centimes && project.budget_estimate_centimes > 0 && timeCostCentimes > 0 && (
                  <div className={`border-t pt-3 rounded-lg p-2 mt-2 ${timeCostCentimes > project.budget_estimate_centimes ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                    <p className="text-xs font-medium">Budget vs réel</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Budget estimé</span>
                      <span className="font-medium">{money(project.budget_estimate_centimes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coût réel</span>
                      <span className={`font-medium ${timeCostCentimes > project.budget_estimate_centimes ? "text-red-700" : "text-green-700"}`}>{money(timeCostCentimes)}</span>
                    </div>
                    {timeCostCentimes > project.budget_estimate_centimes && (
                      <p className="text-xs text-red-600 font-semibold mt-1">
                        Dépassement : +{money(timeCostCentimes - project.budget_estimate_centimes)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <PhaseBudgetPlanner
            projectId={id}
            initialBudgets={phaseBudgets}
            actuals={phaseActuals}
          />

          {/* Time entries breakdown by phase */}
          {allEntries.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Détail du temps par phase</p>
                {(() => {
                  const byPhase: Record<string, { minutes: number; cost: number }> = {};
                  for (const e of allEntries) {
                    const key = e.phase ?? "Sans phase";
                    if (!byPhase[key]) byPhase[key] = { minutes: 0, cost: 0 };
                    byPhase[key]!.minutes += e.duration_minutes;
                    byPhase[key]!.cost += Math.round((e.duration_minutes / 60) * (e.rate_centimes ?? 0));
                  }
                  return (
                    <div className="space-y-2">
                      {Object.entries(byPhase).map(([phase, { minutes, cost }]) => (
                        <div key={phase} className="flex items-center gap-3 text-sm">
                          <span className="w-36 text-muted-foreground capitalize truncate">{phase}</span>
                          <div className="flex-1 bg-[#F1F5F9] rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min(100, Math.round((minutes / totalMinutes) * 100))}%` }}
                            />
                          </div>
                          <span className="w-16 text-right font-medium tabular-nums">
                            {Math.floor(minutes / 60)}h{minutes % 60 > 0 ? `${minutes % 60}` : ""}
                          </span>
                          {hasRates && (
                            <span className="w-28 text-right text-muted-foreground tabular-nums">{money(cost)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discussion" className="mt-4">
          <CommentsSection
            resourceType="project"
            resourceId={id}
            initialComments={(comments ?? []).map((c) => ({ ...c, author_email: undefined }))}
            currentUserId={user?.id ?? ""}
            canModerate={canModerateComments}
            revalidatePath={`/projects/${id}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
