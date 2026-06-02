import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/types";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

export const ACTIVE_WORKSPACE_COOKIE = "archidesk_active_workspace_id";
export const WORKSPACE_WRITE_ROLES = ["owner", "admin", "member"] as const;
export const WORKSPACE_ADMIN_ROLES = ["owner", "admin"] as const;

export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceAccountStatus = "active" | "suspended" | "cancelled";

type WorkspaceScopedTable =
  | "clients"
  | "projects"
  | "devis"
  | "factures"
  | "files"
  | "suppliers"
  | "workspace_members";

type WorkspaceContext = {
  user: User;
  workspaceId: string;
  role: WorkspaceMemberRole;
  accountStatus: WorkspaceAccountStatus;
};

type ActiveWorkspaceContext = {
  workspaceId: string;
  accountStatus: WorkspaceAccountStatus;
};

async function getActiveWorkspaceIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requireWorkspaceAccountActive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
): Promise<Result<{ accountStatus: WorkspaceAccountStatus }>> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("account_status")
    .eq("id", workspaceId)
    .maybeSingle<{ account_status: WorkspaceAccountStatus }>();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Espace de travail introuvable." };
  if (data.account_status === "suspended") {
    return { ok: false, error: "Ce workspace est suspendu." };
  }
  if (data.account_status === "cancelled") {
    return { ok: false, error: "Ce workspace est annulé." };
  }

  return { ok: true, data: { accountStatus: data.account_status } };
}

export async function requireActiveWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId?: string
): Promise<Result<ActiveWorkspaceContext>> {
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    resolvedUserId = user?.id;
  }
  if (!resolvedUserId) return { ok: false, error: "Non authentifié." };

  const workspaceId = await getWorkspaceId(supabase, resolvedUserId);
  if (!workspaceId) return { ok: false, error: "Espace de travail introuvable." };

  const activeWorkspace = await requireWorkspaceAccountActive(supabase, workspaceId);
  if (!activeWorkspace.ok) return activeWorkspace;

  return { ok: true, data: { workspaceId, accountStatus: activeWorkspace.data.accountStatus } };
}

/**
 * Returns the active workspace for the authenticated user.
 * If a valid active workspace cookie exists, it wins; otherwise we fall back
 * to the first membership for backwards compatibility.
 */
export async function getWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId?: string
): Promise<string | null> {
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    resolvedUserId = user?.id;
  }
  if (!resolvedUserId) return null;

  const activeWorkspaceId = await getActiveWorkspaceIdFromCookie();
  if (activeWorkspaceId) {
    const { data: activeMembership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", resolvedUserId)
      .eq("workspace_id", activeWorkspaceId)
      .maybeSingle();

    if (activeMembership?.workspace_id) return activeMembership.workspace_id;
  }

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", resolvedUserId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  return data?.workspace_id ?? null;
}

export async function assertWorkspaceRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: WorkspaceScopedTable,
  id: string | null | undefined,
  workspaceId: string,
  label = "Ressource"
): Promise<Result<void>> {
  if (!id) return { ok: true, data: undefined };

  const idColumn = table === "workspace_members" ? "user_id" : "id";
  const { data, error } = await supabase
    .from(table)
    .select(idColumn)
    .eq(idColumn, id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: `${label} introuvable dans cet espace de travail.` };

  return { ok: true, data: undefined };
}

export async function assertProjectMatchesClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  projectId: string | null | undefined,
  clientId: string | null | undefined
): Promise<Result<void>> {
  if (!projectId || !clientId) return { ok: true, data: undefined };

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Le projet sélectionné n'appartient pas à ce client." };

  return { ok: true, data: undefined };
}

export async function assertDevisMatchesContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  devisId: string | null | undefined,
  clientId: string | null | undefined,
  projectId: string | null | undefined
): Promise<Result<void>> {
  if (!devisId) return { ok: true, data: undefined };

  let query = supabase
    .from("devis")
    .select("id")
    .eq("id", devisId)
    .eq("workspace_id", workspaceId);

  if (clientId) query = query.eq("client_id", clientId);
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query.maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Le devis sélectionné ne correspond pas au client/projet." };

  return { ok: true, data: undefined };
}

export async function assertWorkspaceRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  checks: Array<{
    table: WorkspaceScopedTable;
    id: string | null | undefined;
    label: string;
  }>
): Promise<Result<void>> {
  for (const check of checks) {
    const result = await assertWorkspaceRecord(supabase, check.table, check.id, workspaceId, check.label);
    if (!result.ok) return result;
  }

  return { ok: true, data: undefined };
}

export async function requireWorkspaceRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  allowedRoles: readonly WorkspaceMemberRole[] = WORKSPACE_WRITE_ROLES
): Promise<Result<WorkspaceContext>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const activeWorkspace = await requireActiveWorkspace(supabase, user.id);
  if (!activeWorkspace.ok) return activeWorkspace;
  const { workspaceId, accountStatus } = activeWorkspace.data;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle<{ role: WorkspaceMemberRole }>();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Vous n'avez pas accès à cet espace de travail." };
  if (!allowedRoles.includes(data.role)) {
    return { ok: false, error: "Votre rôle ne permet pas cette action." };
  }

  return { ok: true, data: { user, workspaceId, role: data.role, accountStatus } };
}
