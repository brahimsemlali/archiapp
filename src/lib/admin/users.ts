import "server-only";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/admin/auth";

export type AdminUserWorkspace = {
  workspaceId: string;
  workspaceName: string;
  role: string;
};

export type AdminUser = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  isSuperadmin: boolean;
  workspaces: AdminUserWorkspace[];
};

export async function listAdminUsers(query?: string): Promise<AdminUser[]> {
  const supabase = await createClient();
  await requireSuperadmin(supabase);

  const serviceSupabase = await createServiceClient();
  const [{ data: usersResult, error: usersError }, { data: memberships, error: membershipsError }] = await Promise.all([
    serviceSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    serviceSupabase
      .from("workspace_members")
      .select("user_id, role, workspace_id, workspaces!workspace_members_workspace_id_fkey(id, name)")
      .order("joined_at", { ascending: false }),
  ]);

  if (usersError) throw new Error(usersError.message);
  if (membershipsError) throw new Error(membershipsError.message);

  const superadminEmails = new Set(
    (process.env.SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  const membershipsByUser = new Map<string, AdminUserWorkspace[]>();
  for (const membership of memberships ?? []) {
    const linkedWorkspace = Array.isArray(membership.workspaces)
      ? membership.workspaces[0]
      : membership.workspaces;
    const items = membershipsByUser.get(membership.user_id) ?? [];
    items.push({
      workspaceId: membership.workspace_id,
      workspaceName: linkedWorkspace?.name ?? "Cabinet",
      role: membership.role,
    });
    membershipsByUser.set(membership.user_id, items);
  }

  const users = usersResult.users.map((user) => ({
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    bannedUntil: user.banned_until ?? null,
    isSuperadmin: !!user.email && superadminEmails.has(user.email.toLowerCase()),
    workspaces: membershipsByUser.get(user.id) ?? [],
  } satisfies AdminUser));

  const search = query?.trim().toLowerCase();
  if (!search) return users;

  return users.filter((user) => (
    user.email?.toLowerCase().includes(search) ||
    user.id.toLowerCase().includes(search) ||
    user.workspaces.some((workspace) => (
      workspace.workspaceName.toLowerCase().includes(search) ||
      workspace.workspaceId.toLowerCase().includes(search) ||
      workspace.role.toLowerCase().includes(search)
    ))
  ));
}
