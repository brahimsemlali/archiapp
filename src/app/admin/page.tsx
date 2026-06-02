import { notFound } from "next/navigation";
import { Activity, Building2, Crown, Database, Search, ShieldAlert, Sparkles, UserX, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSuperadminUser } from "@/lib/admin/auth";
import { listAdminWorkspaces } from "@/lib/admin/workspaces";
import { listAdminUsers } from "@/lib/admin/users";
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
import { PLAN_LIMITS } from "@/lib/billing/plans";

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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ adminError?: string; adminNotice?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const user = await getSuperadminUser(supabase);
  if (!user) notFound();

  const params = await searchParams;
  const [workspaces, users] = await Promise.all([
    listAdminWorkspaces(params.q),
    listAdminUsers(params.q),
  ]);
  const activeCount = workspaces.filter((workspace) => workspace.accountStatus === "active").length;
  const suspendedCount = workspaces.filter((workspace) => workspace.accountStatus === "suspended").length;
  const aiCount = workspaces.filter((workspace) => workspace.plan === "studio" || workspace.plan === "agence").length;
  const bannedUsersCount = users.filter((userRow) => userRow.bannedUntil).length;
  const orphanUsersCount = users.filter((userRow) => userRow.workspaces.length === 0).length;
  const totalStorageBytes = workspaces.reduce((sum, workspace) => sum + workspace.storageBytes, 0);
  const totalAiCalls = workspaces.reduce((sum, workspace) => sum + workspace.aiCallsThisMonth, 0);

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

          <form action={adminSearchAction} className="flex w-full gap-2 md:w-[360px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <Input name="q" defaultValue={params.q ?? ""} placeholder="Chercher cabinet, email, ID..." className="h-10 pl-9" />
            </div>
            <Button type="submit" className="h-10">Chercher</Button>
          </form>
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

        <section className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Workspaces", value: workspaces.length, icon: Building2, tone: "text-[#2563EB]" },
            { label: "Actifs", value: activeCount, icon: Activity, tone: "text-[#2F8F5C]" },
            { label: "Suspendus", value: suspendedCount, icon: ShieldAlert, tone: "text-[#C75B2E]" },
            { label: "Utilisateurs bloqués", value: bannedUsersCount, icon: UserX, tone: "text-[#C75B2E]" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_28px_rgba(22,23,14,0.055)]">
                <Icon className={`mb-3 h-5 w-5 ${item.tone}`} />
                <p className="text-2xl font-semibold tabnum">{item.value}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{item.label}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center gap-2 text-[#2563EB]">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Plans AI</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tabnum">{aiCount}</p>
            <p className="mt-1 text-xs text-[#64748B]">{totalAiCalls} appels IA ce mois</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Utilisateurs sans workspace</p>
            <p className="mt-2 text-2xl font-semibold tabnum">{orphanUsersCount}</p>
            <p className="mt-1 text-xs text-[#64748B]">Comptes auth à vérifier</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center gap-2 text-[#2F8F5C]">
              <Database className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Stockage total</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tabnum">{formatStorage(totalStorageBytes)}</p>
            <p className="mt-1 text-xs text-[#64748B]">Tous cabinets confondus</p>
          </div>
        </section>

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
                    <p>{workspace.membersCount} membres</p>
                    <p>{workspace.projectsCount} projets</p>
                    <p>{workspace.clientsCount} clients</p>
                    <p>{formatStorage(workspace.storageBytes)}</p>
                    <p>{workspace.aiCallsThisMonth} appels IA/mois</p>
                    <p>Dernière activité: {formatDate(workspace.lastActivityAt)}</p>
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
      </div>
    </main>
  );
}
