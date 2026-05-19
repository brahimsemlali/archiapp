"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { randomBytes } from "crypto";
import { assertSeatAvailable } from "@/lib/billing/guards";
import { getPlanLimits } from "@/lib/billing/plans";
import { requireActiveWorkspace, requireWorkspaceAccountActive, setActiveWorkspaceCookie } from "@/lib/workspace";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";

export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: WorkspaceMemberRole;
  joinedAt: string;
  user: {
    email: string;
    fullName?: string;
  };
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceMemberRole;
  token: string;
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  createdAt: string;
}

type WorkspaceMemberRoleRow = { role: WorkspaceMemberRole };

async function getWorkspaceAndUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, workspaceId: null };
  const workspace = await requireActiveWorkspace(supabase, user.id);
  if (!workspace.ok) return { user: null, workspaceId: null };
  return { user, workspaceId: workspace.data.workspaceId };
}

async function getCurrentMemberRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  userId: string
): Promise<Result<WorkspaceMemberRole>> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle<WorkspaceMemberRoleRow>();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Vous n'avez pas accès à cet espace de travail." };

  return { ok: true, data: data.role };
}

function canManageTeam(role: WorkspaceMemberRole) {
  return role === "owner" || role === "admin";
}

export async function switchWorkspaceAction(workspaceId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!membership) return { ok: false, error: "Vous n'avez pas accès à cet espace de travail." };
  const workspaceStatus = await requireWorkspaceAccountActive(supabase, workspaceId);
  if (!workspaceStatus.ok) return { ok: false, error: workspaceStatus.error };

  await setActiveWorkspaceCookie(workspaceId);
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function getWorkspaceMembersAction(): Promise<Result<{ members: WorkspaceMember[]; invites: WorkspaceInvite[] }>> {
  const supabase = await createClient();
  const { user, workspaceId } = await getWorkspaceAndUser(supabase);
  if (!user || !workspaceId) return { ok: false, error: "Non authentifié." };

  const { data: membersData, error: membersError } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, joined_at")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  if (membersError) return { ok: false, error: membersError.message };

  const members: WorkspaceMember[] = (membersData ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    role: m.role as WorkspaceMemberRole,
    joinedAt: m.joined_at,
    user: { email: m.user_id },
  }));

  const { data: invitesData } = await supabase
    .from("workspace_invites")
    .select("id, email, role, token, status, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const invites: WorkspaceInvite[] = (invitesData ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role as WorkspaceMemberRole,
    token: i.token,
    status: i.status,
    expiresAt: i.expires_at,
    createdAt: i.created_at,
  }));

  return { ok: true, data: { members, invites } };
}

export async function inviteMemberAction(
  email: string,
  role: WorkspaceMemberRole
): Promise<Result<{ invite: WorkspaceInvite; inviteUrl: string }>> {
  const supabase = await createClient();
  const { user, workspaceId } = await getWorkspaceAndUser(supabase);
  if (!user || !workspaceId) return { ok: false, error: "Non authentifié." };
  const currentRole = await getCurrentMemberRole(supabase, workspaceId, user.id);
  if (!currentRole.ok) return currentRole;
  if (!canManageTeam(currentRole.data)) return { ok: false, error: "Seuls les administrateurs peuvent inviter des membres." };

  if (!email || !email.includes("@")) return { ok: false, error: "Email invalide." };
  const seatCheck = await assertSeatAvailable(supabase, workspaceId);
  if (!seatCheck.ok) return seatCheck;

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Revoke any existing pending invites for this email
  await supabase
    .from("workspace_invites")
    .update({ status: "revoked" })
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .eq("status", "pending");

  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email,
      role,
      token,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id, email, role, token, status, expires_at, created_at")
    .single();

  if (error) return { ok: false, error: error.message };
  if (!invite) return { ok: false, error: "Invitation non créée." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${token}`;

  // Fetch workspace name for the invite email
  const { data: ws } = await supabase.from("workspaces").select("name").eq("id", workspaceId).single();
  const { data: inviterProfile } = await supabase
    .from("firm_profile")
    .select("architect_name, firm_name")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const inviterName = inviterProfile?.architect_name ?? inviterProfile?.firm_name ?? user.email ?? "L'équipe";
  const workspaceName = ws?.name ?? inviterProfile?.firm_name ?? "ArchiDesk";

  const tmpl = inviteEmail({ inviterName, workspaceName, role, inviteUrl });
  await sendEmail({
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    workspaceId,
    eventType: "invite_sent",
    resourceType: "workspace_invite",
    resourceId: invite.id,
  });

  revalidatePath("/settings");
  return {
    ok: true,
    data: {
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role as WorkspaceMemberRole,
        token: invite.token,
        status: invite.status as WorkspaceInvite["status"],
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      },
      inviteUrl,
    },
  };
}

export async function revokeInviteAction(inviteId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const { user, workspaceId } = await getWorkspaceAndUser(supabase);
  if (!user || !workspaceId) return { ok: false, error: "Non authentifié." };
  const currentRole = await getCurrentMemberRole(supabase, workspaceId, user.id);
  if (!currentRole.ok) return currentRole;
  if (!canManageTeam(currentRole.data)) return { ok: false, error: "Seuls les administrateurs peuvent révoquer une invitation." };

  const { data, error } = await supabase
    .from("workspace_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Invitation introuvable ou déjà révoquée." };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function updateMemberRoleAction(memberId: string, role: WorkspaceMemberRole): Promise<Result<void>> {
  const supabase = await createClient();
  const { user, workspaceId } = await getWorkspaceAndUser(supabase);
  if (!user || !workspaceId) return { ok: false, error: "Non authentifié." };
  const currentRole = await getCurrentMemberRole(supabase, workspaceId, user.id);
  if (!currentRole.ok) return currentRole;
  if (!canManageTeam(currentRole.data)) return { ok: false, error: "Seuls les administrateurs peuvent modifier les rôles." };

  if (role === "owner") return { ok: false, error: "Impossible d'assigner le rôle propriétaire." };

  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .neq("role", "owner")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Membre introuvable ou protégé." };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function removeMemberAction(memberId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const { user, workspaceId } = await getWorkspaceAndUser(supabase);
  if (!user || !workspaceId) return { ok: false, error: "Non authentifié." };
  const currentRole = await getCurrentMemberRole(supabase, workspaceId, user.id);
  if (!currentRole.ok) return currentRole;
  if (!canManageTeam(currentRole.data)) return { ok: false, error: "Seuls les administrateurs peuvent retirer un membre." };

  const { data, error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .neq("role", "owner")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Membre introuvable ou protégé." };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function acceptInviteAction(token: string): Promise<Result<{ workspaceId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Vous devez être connecté pour accepter une invitation." };

  const serviceSupabase = await createServiceClient();

  const { data: invite, error: inviteError } = await serviceSupabase
    .from("workspace_invites")
    .select("id, workspace_id, email, role, status, expires_at")
    .eq("token", token)
    .single();

  if (inviteError || !invite) return { ok: false, error: "Invitation introuvable." };
  if (invite.status !== "pending") return { ok: false, error: "Cette invitation a déjà été utilisée ou révoquée." };
  if (new Date(invite.expires_at) < new Date()) return { ok: false, error: "Cette invitation a expiré." };
  const workspaceStatus = await requireWorkspaceAccountActive(serviceSupabase, invite.workspace_id);
  if (!workspaceStatus.ok) return { ok: false, error: workspaceStatus.error };
  if (invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return {
      ok: false,
      error: "Cette invitation est liée à une autre adresse email. Connectez-vous avec l'adresse invitée.",
    };
  }

  const { data: existingMember } = await serviceSupabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember) {
    const [{ data: workspace }, { count: memberCount, error: countError }] = await Promise.all([
      serviceSupabase.from("workspaces").select("plan").eq("id", invite.workspace_id).single(),
      serviceSupabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", invite.workspace_id),
    ]);

    if (countError) return { ok: false, error: countError.message };

    const limits = getPlanLimits(workspace?.plan);
    if ((memberCount ?? 0) >= limits.seats) {
      return {
        ok: false,
        error: `Limite d'utilisateurs atteinte pour le plan ${limits.label} (${limits.seats}).`,
      };
    }
  }

  // Add user to workspace
  const { error: memberError } = existingMember
    ? { error: null }
    : await serviceSupabase.from("workspace_members").insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
        invited_by: null,
      });

  if (memberError && !memberError.message.includes("duplicate")) {
    return { ok: false, error: memberError.message };
  }

  // Mark invite as accepted
  await serviceSupabase
    .from("workspace_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", invite.id);

  await setActiveWorkspaceCookie(invite.workspace_id);

  return { ok: true, data: { workspaceId: invite.workspace_id } };
}
