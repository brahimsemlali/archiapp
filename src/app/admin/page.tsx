import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, Coins, Crown, Database, Download, History, Search, Sparkles, TrendingUp, UserX, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSuperadminUser } from "@/lib/admin/auth";
import { listAdminWorkspaces, type AdminWorkspace } from "@/lib/admin/workspaces";
import { listAdminUsers } from "@/lib/admin/users";
import { getAdminMetrics, getAttentionList } from "@/lib/admin/metrics";
import { listSuperadminAudit, auditActionLabel } from "@/lib/admin/audit";
import { adminSearchAction, createWorkspaceForUserAdminAction, updateAdminUserAuthAction, updateWorkspaceAdminAction, updateWorkspaceOwnerAuthAction } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLAN_LIMITS, getPlanLimits } from "@/lib/billing/plans";

function formatMad(value: number) {
  return `${value.toLocaleString("fr-FR")} MAD`;
}

const ATTENTION_TONE: Record<string, string> = {
  past_due: "border-[#F0D2C1] bg-[#FCEFE6] text-[#9F3D1F]",
  suspended: "border-[#E5E7EB] bg-[#F1F5F9] text-[#475569]",
  trial_ending: "border-[#FBE6C0] bg-[#FDF6E9] text-[#9A6B12]",
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  cancelled: "Annulé",
};

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  manual: "Manuel",
  trialing: "Essai",
  active: "Payé",
  past_due: "Paiement échoué",
  paused: "Pause",
  cancelled: "Annulé",
};

function statusBadge(status: string) {
  if (status === "active") return "bg-[#E5F3EB] text-[#2F8F5C]";
  if (status === "suspended") return "bg-[#FCEFE6] text-[#C75B2E]";
  return "bg-[#F1F5F9] text-[#475569]";
}

function formatDate(value: string | null) {
  if (!value) return "Jamais";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatStorage(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}

/** Usage vs the workspace's plan limits, flagging anything over (abuse / upgrade signal). */
function UsageLines({ workspace }: { workspace: AdminWorkspace }) {
  const limits = getPlanLimits(workspace.plan);
  const storageLimitBytes = limits.storageGb * 1024 * 1024 * 1024;
  const over = {
    seats: workspace.membersCount > limits.seats,
    projects: limits.projects !== null && workspace.projectsCount > limits.projects,
    storage: workspace.storageBytes > storageLimitBytes,
    ai: limits.aiEnabled && workspace.aiCallsThisMonth > limits.aiCalls,
  };
  const flag = (on: boolean) => (on ? "font-semibold text-[#C75B2E]" : "");
  return (
    <>
      <p className={flag(over.seats)}>{workspace.membersCount}/{limits.seats} membres</p>
      <p className={flag(over.projects)}>{workspace.projectsCount}/{limits.projects ?? "∞"} projets</p>
      <p className={flag(over.storage)}>{formatStorage(workspace.storageBytes)} / {limits.storageGb} Go</p>
      <p className={flag(over.ai)}>{workspace.aiCallsThisMonth}{limits.aiEnabled ? `/${limits.aiCalls}` : ""} appels IA</p>
      <p>{workspace.clientsCount} clients</p>
      <p className="text-xs text-[#ADAB9D]">Activité : {formatDate(workspace.lastActivityAt)}</p>
    </>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ adminError?: string; adminNotice?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const user = await getSuperadminUser(supabase);
  if (!user) notFound();

  const params = await searchParams;
  const [workspaces, users, auditEntries] = await Promise.all([
    listAdminWorkspaces(params.q),
    listAdminUsers(params.q),
    listSuperadminAudit(40),
  ]);
  // Metrics + attention are computed over the (optionally filtered) workspace list;
  // when no search is active that's the whole base, which is what we want.
  const metrics = getAdminMetrics(workspaces);
  const attention = getAttentionList(workspaces);
  const bannedUsersCount = users.filter((userRow) => userRow.bannedUntil).length;
  const orphanUsersCount = users.filter((userRow) => userRow.workspaces.length === 0).length;

  return (
    <main className="min-h-dvh bg-[#F7F8FA] px-5 py-6 text-[#0B1220]">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_50px_rgba(22,23,14,0.07)] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B1220] text-white">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow mb-1">Superadmin</p>
              <h1 className="font-fraunces text-3xl font-semibold tracking-normal">Contrôle SaaS</h1>
              <p className="mt-1 text-sm text-[#64748B]">Connecté comme {user.email}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <form action={adminSearchAction} className="flex w-full gap-2 md:w-[360px]">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Chercher cabinet, email, ID..." className="h-10 pl-9" />
              </div>
              <Button type="submit" className="h-10">Chercher</Button>
            </form>
            <Link
              href="/admin/export"
              prefetch={false}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#0B1220] transition-colors hover:bg-[#F1F5F9]"
            >
              <Download className="h-4 w-4" />CSV
            </Link>
          </div>
        </header>

        {(params.adminNotice || params.adminError) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              params.adminError
                ? "border-[#F0D2C1] bg-[#FCEFE6] text-[#9F3D1F]"
                : "border-[#CFE7D8] bg-[#E5F3EB] text-[#2F8F5C]"
            }`}
          >
            {params.adminError ?? params.adminNotice}
          </div>
        )}

        {/* Revenue cockpit — the founder-facing headline numbers */}
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[#CFE7D8] bg-gradient-to-br from-[#F2FAF5] to-white p-5 shadow-[0_10px_28px_rgba(22,23,14,0.055)]">
            <div className="flex items-center gap-2 text-[#2F8F5C]"><Coins className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide">MRR encaissé</p></div>
            <p className="mt-2 text-3xl font-semibold tabnum text-[#0B1220]">{formatMad(metrics.collectedMrrMad)}</p>
            <p className="mt-1 text-xs text-[#64748B]">{metrics.collectedPayingCount} abonnés payants · ARR {formatMad(metrics.collectedArrMad)}</p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(22,23,14,0.055)]">
            <div className="flex items-center gap-2 text-[#2563EB]"><Clock className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Essais actifs</p></div>
            <p className="mt-2 text-3xl font-semibold tabnum">{metrics.activeTrials}</p>
            <p className="mt-1 text-xs text-[#64748B]">{metrics.trialsEndingSoon} se terminent ≤ 7 j</p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(22,23,14,0.055)]">
            <div className="flex items-center gap-2 text-[#C75B2E]"><AlertTriangle className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">À risque</p></div>
            <p className="mt-2 text-3xl font-semibold tabnum">{metrics.pastDueCount}</p>
            <p className="mt-1 text-xs text-[#64748B]">paiement échoué · {metrics.suspendedCount} suspendus · {metrics.churnedCount} résiliés</p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(22,23,14,0.055)]">
            <div className="flex items-center gap-2 text-[#2563EB]"><TrendingUp className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Nouveaux ce mois</p></div>
            <p className="mt-2 text-3xl font-semibold tabnum">{metrics.newThisMonth}</p>
            <p className="mt-1 text-xs text-[#64748B]">{metrics.totalWorkspaces} cabinets au total</p>
          </div>
        </section>

        {/* Secondary ops row */}
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Actifs manuels / offerts</p>
            <p className="mt-2 text-2xl font-semibold tabnum">{metrics.manualActiveCount}</p>
            <p className="mt-1 text-xs text-[#64748B]">{formatMad(metrics.manualActiveValueMad)} si facturés — hors MRR</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center gap-2 text-[#2563EB]"><Sparkles className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Appels IA ce mois</p></div>
            <p className="mt-2 text-2xl font-semibold tabnum">{metrics.totalAiCalls}</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center gap-2 text-[#2F8F5C]"><Database className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Stockage total</p></div>
            <p className="mt-2 text-2xl font-semibold tabnum">{formatStorage(metrics.totalStorageBytes)}</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center gap-2 text-[#C75B2E]"><UserX className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Comptes à vérifier</p></div>
            <p className="mt-2 text-2xl font-semibold tabnum">{bannedUsersCount + orphanUsersCount}</p>
            <p className="mt-1 text-xs text-[#64748B]">{bannedUsersCount} bloqués · {orphanUsersCount} sans workspace</p>
          </div>
        </section>

        {/* Needs attention — the daily action list */}
        {attention.length > 0 && (
          <section className="rounded-2xl border border-[#F0D2C1] bg-white p-4 shadow-[0_10px_28px_rgba(22,23,14,0.055)]">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#C75B2E]" />
              <h2 className="text-base font-semibold">À traiter ({attention.length})</h2>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {attention.map((item) => (
                <div key={`${item.workspace.id}-${item.reason}`} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${ATTENTION_TONE[item.reason]}`}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.workspace.name}</p>
                    <p className="truncate text-xs opacity-80">{item.workspace.ownerEmail ?? item.workspace.ownerId}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium">{item.detail}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_18px_50px_rgba(22,23,14,0.07)]">
          <div className="border-b border-[#F0EEE8] p-4">
            <h2 className="text-base font-semibold">Cabinets clients</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Changez le plan, suspendez l'accès workspace, ou préparez le lien LemonSqueezy d'un cabinet.
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cabinet</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>LemonSqueezy</TableHead>
                <TableHead className="min-w-[280px]">Contrôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-[#64748B]">
                    Aucun workspace trouvé.
                  </TableCell>
                </TableRow>
              )}
              {workspaces.map((workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell className="align-top">
                    <div className="max-w-[260px]">
                      <p className="font-semibold text-[#0B1220]">{workspace.name}</p>
                      <p className="mt-1 truncate text-xs text-[#64748B]">{workspace.ownerEmail ?? workspace.ownerId}</p>
                      {workspace.ownerBannedUntil && (
                        <p className="mt-1 text-xs font-semibold text-[#C75B2E]">
                          Login bloqué jusqu'au {new Date(workspace.ownerBannedUntil).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-[#ADAB9D] tabnum">{workspace.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-sm text-[#475569]">
                    <UsageLines workspace={workspace} />
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline">{PLAN_LIMITS[workspace.plan].label}</Badge>
                    <p className="mt-1 text-xs text-[#64748B]">{PLAN_LIMITS[workspace.plan].monthlyPriceMad} MAD/mois</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(workspace.accountStatus)}`}>
                      {ACCOUNT_STATUS_LABELS[workspace.accountStatus]}
                    </span>
                    <p className="mt-2 text-xs text-[#64748B]">{SUBSCRIPTION_STATUS_LABELS[workspace.subscriptionStatus]}</p>
                    {workspace.suspendedReason && (
                      <p className="mt-1 max-w-[180px] whitespace-normal text-xs text-[#C75B2E]">{workspace.suspendedReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-xs text-[#475569]">
                    <p>{workspace.subscriptionSource}</p>
                    <p className="mt-1 max-w-[160px] truncate tabnum">{workspace.lemonSqueezySubscriptionId ?? "Aucun abonnement"}</p>
                    {workspace.currentPeriodEnd && (
                      <p className="mt-1">Fin: {formatDate(workspace.currentPeriodEnd)}</p>
                    )}
                    {workspace.trialEndsAt && (
                      <p className="mt-1">Essai: {formatDate(workspace.trialEndsAt)}</p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <form action={updateWorkspaceAdminAction} className="grid gap-2">
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <div className="grid grid-cols-2 gap-2">
                        <select name="plan" defaultValue={workspace.plan} className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm">
                          <option value="solo">Basic</option>
                          <option value="studio">Studio AI</option>
                          <option value="agence">Agence AI</option>
                        </select>
                        <select name="accountStatus" defaultValue={workspace.accountStatus} className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm">
                          <option value="active">Actif</option>
                          <option value="suspended">Suspendu</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                        <select name="subscriptionStatus" defaultValue={workspace.subscriptionStatus} className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm">
                          <option value="manual">Manuel</option>
                          <option value="trialing">Essai</option>
                          <option value="active">Payé</option>
                          <option value="past_due">Paiement échoué</option>
                          <option value="paused">Pause</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                        <select name="subscriptionSource" defaultValue={workspace.subscriptionSource} className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm">
                          <option value="manual">Manual</option>
                          <option value="lemonsqueezy">LemonSqueezy</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="lemonSqueezyCustomerId" defaultValue={workspace.lemonSqueezyCustomerId ?? ""} placeholder="Lemon customer ID" className="h-9 text-xs" />
                        <Input name="lemonSqueezySubscriptionId" defaultValue={workspace.lemonSqueezySubscriptionId ?? ""} placeholder="Lemon subscription ID" className="h-9 text-xs" />
                      </div>
                      <Input name="currentPeriodEnd" defaultValue={workspace.currentPeriodEnd ?? ""} placeholder="current_period_end ISO" className="h-9 text-xs" />
                      <Input name="suspendedReason" defaultValue={workspace.suspendedReason ?? ""} placeholder="Raison suspension" className="h-9 text-xs" />
                      <Button type="submit" size="sm" className="justify-self-start bg-[#0B1220] text-white hover:bg-[#2C2D24]">
                        Enregistrer
                      </Button>
                    </form>
                    <form action={updateWorkspaceOwnerAuthAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <input type="hidden" name="ownerId" value={workspace.ownerId} />
                      <Button
                        type="submit"
                        name="mode"
                        value={workspace.ownerBannedUntil ? "unban" : "ban"}
                        size="sm"
                        variant="outline"
                        className={workspace.ownerBannedUntil ? "border-[#2F8F5C] text-[#2F8F5C]" : "border-[#F0D2C1] text-[#C75B2E]"}
                      >
                        {workspace.ownerBannedUntil ? "Réactiver login owner" : "Bloquer login owner"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_18px_50px_rgba(22,23,14,0.07)]">
          <div className="border-b border-[#F0EEE8] p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#2563EB]" />
              <h2 className="text-base font-semibold">Utilisateurs auth</h2>
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              Contrôle direct des comptes Supabase Auth. Bloquer un utilisateur coupe son login, même s'il appartient à plusieurs workspaces.
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Statut login</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-[#64748B]">
                    Aucun utilisateur trouvé.
                  </TableCell>
                </TableRow>
              )}
              {users.map((userRow) => (
                <TableRow key={userRow.id}>
                  <TableCell className="align-top">
                    <p className="font-semibold text-[#0B1220]">{userRow.email ?? "Sans email"}</p>
                    <p className="mt-1 text-[11px] text-[#ADAB9D] tabnum">{userRow.id}</p>
                    {userRow.isSuperadmin && (
                      <Badge variant="outline" className="mt-2 border-[#2563EB] text-[#2563EB]">Superadmin</Badge>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {userRow.workspaces.length > 0 ? (
                      <div className="space-y-1">
                        {userRow.workspaces.map((workspace) => (
                          <div key={`${userRow.id}-${workspace.workspaceId}`} className="text-xs text-[#475569]">
                            <span className="font-semibold text-[#0B1220]">{workspace.workspaceName}</span>
                            <span className="ml-1 text-[#ADAB9D]">({workspace.role})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[#C75B2E]">Aucun workspace</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm text-[#475569]">
                    <p>{formatDate(userRow.lastSignInAt)}</p>
                    <p className="mt-1 text-xs text-[#ADAB9D]">Créé {formatDate(userRow.createdAt)}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    {userRow.bannedUntil ? (
                      <span className="inline-flex rounded-full bg-[#FCEFE6] px-2 py-1 text-xs font-semibold text-[#C75B2E]">
                        Bloqué jusqu'au {formatDate(userRow.bannedUntil)}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[#E5F3EB] px-2 py-1 text-xs font-semibold text-[#2F8F5C]">
                        Autorisé
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {userRow.workspaces.length === 0 && (
                      <form action={createWorkspaceForUserAdminAction} className="mb-2">
                        <input type="hidden" name="userId" value={userRow.id} />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-[#0B1220] text-white hover:bg-[#2C2D24]"
                        >
                          Créer workspace
                        </Button>
                      </form>
                    )}
                    <form action={updateAdminUserAuthAction}>
                      <input type="hidden" name="userId" value={userRow.id} />
                      {userRow.workspaces[0] && <input type="hidden" name="workspaceId" value={userRow.workspaces[0].workspaceId} />}
                      <Button
                        type="submit"
                        name="mode"
                        value={userRow.bannedUntil ? "unban" : "ban"}
                        size="sm"
                        variant="outline"
                        disabled={userRow.isSuperadmin}
                        className={userRow.bannedUntil ? "border-[#2F8F5C] text-[#2F8F5C]" : "border-[#F0D2C1] text-[#C75B2E]"}
                      >
                        {userRow.bannedUntil ? "Réactiver login" : "Bloquer login"}
                      </Button>
                    </form>
                    {userRow.isSuperadmin && (
                      <p className="mt-2 max-w-[180px] whitespace-normal text-xs text-[#64748B]">
                        Protection anti auto-blocage.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_18px_50px_rgba(22,23,14,0.07)]">
          <div className="border-b border-[#F0EEE8] p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#64748B]" />
              <h2 className="text-base font-semibold">Journal superadmin</h2>
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              40 dernières actions superadmin (plans, suspensions, blocages). Traçabilité des contrôles sensibles.
            </p>
          </div>
          {auditEntries.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#64748B]">Aucune action superadmin enregistrée.</p>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {auditEntries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  <span className="font-medium text-[#0B1220]">{auditActionLabel(entry.action)}</span>
                  {entry.detail && <span className="text-xs text-[#64748B]">{entry.detail}</span>}
                  <span className="ml-auto text-xs text-[#ADAB9D]">{entry.actorEmail ?? "—"}</span>
                  <span className="text-xs text-[#ADAB9D] tabnum">{new Date(entry.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
