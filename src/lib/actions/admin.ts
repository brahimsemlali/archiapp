"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/admin/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PLANS = ["solo", "studio", "agence"] as const;
const ACCOUNT_STATUSES = ["active", "suspended", "cancelled"] as const;
const SUBSCRIPTION_STATUSES = ["manual", "trialing", "active", "past_due", "paused", "cancelled"] as const;
const SUBSCRIPTION_SOURCES = ["manual", "lemonsqueezy"] as const;

function pickEnum<T extends readonly string[]>(value: FormDataEntryValue | null, allowed: T, fallback: T[number]): T[number] {
  return allowed.includes(String(value)) ? String(value) as T[number] : fallback;
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function redirectWithAdminMessage(type: "adminNotice" | "adminError", message: string): never {
  redirect(`/admin?${type}=${encodeURIComponent(message)}`);
}

export async function updateWorkspaceAdminAction(formData: FormData) {
  const supabase = await createClient();
  const actor = await requireSuperadmin(supabase);
  const serviceSupabase = await createServiceClient();

  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!workspaceId) redirectWithAdminMessage("adminError", "Workspace manquant.");

  const accountStatus = pickEnum(formData.get("accountStatus"), ACCOUNT_STATUSES, "active");
  const subscriptionStatus = pickEnum(formData.get("subscriptionStatus"), SUBSCRIPTION_STATUSES, "manual");
  const subscriptionSource = pickEnum(formData.get("subscriptionSource"), SUBSCRIPTION_SOURCES, "manual");
  const plan = pickEnum(formData.get("plan"), PLANS, "solo");
  const suspendedReason = optionalText(formData.get("suspendedReason"));

  const { error } = await serviceSupabase
    .from("workspaces")
    .update({
      plan,
      account_status: accountStatus,
      subscription_status: subscriptionStatus,
      subscription_source: subscriptionSource,
      lemon_squeezy_customer_id: optionalText(formData.get("lemonSqueezyCustomerId")),
      lemon_squeezy_subscription_id: optionalText(formData.get("lemonSqueezySubscriptionId")),
      current_period_end: optionalText(formData.get("currentPeriodEnd")),
      suspended_at: accountStatus === "suspended" ? new Date().toISOString() : null,
      suspended_reason: accountStatus === "suspended" ? suspendedReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) redirectWithAdminMessage("adminError", error.message);

  await serviceSupabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "superadmin.workspace_updated",
    metadata: {
      actor_id: actor.id,
      actor_email: actor.email,
      plan,
      account_status: accountStatus,
      subscription_status: subscriptionStatus,
      subscription_source: subscriptionSource,
      suspended_reason: accountStatus === "suspended" ? suspendedReason : null,
    },
  });

  revalidatePath("/admin");
  redirectWithAdminMessage("adminNotice", "Workspace mis à jour.");
}

export async function adminSearchAction(formData: FormData) {
  const query = String(formData.get("q") ?? "").trim();
  redirect(query ? `/admin?q=${encodeURIComponent(query)}` : "/admin");
}

export async function updateWorkspaceOwnerAuthAction(formData: FormData) {
  const supabase = await createClient();
  const actor = await requireSuperadmin(supabase);
  const serviceSupabase = await createServiceClient();

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");
  const mode = String(formData.get("mode") ?? "");

  if (!workspaceId || !ownerId) redirectWithAdminMessage("adminError", "Workspace ou propriétaire manquant.");
  if (ownerId === actor.id) redirectWithAdminMessage("adminError", "Vous ne pouvez pas désactiver votre propre compte superadmin.");
  if (mode !== "ban" && mode !== "unban") redirectWithAdminMessage("adminError", "Action invalide.");

  const { error } = await serviceSupabase.auth.admin.updateUserById(ownerId, {
    ban_duration: mode === "ban" ? "876000h" : "none",
  });
  if (error) redirectWithAdminMessage("adminError", error.message);

  await serviceSupabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: mode === "ban" ? "superadmin.owner_banned" : "superadmin.owner_unbanned",
    metadata: {
      actor_id: actor.id,
      actor_email: actor.email,
      owner_id: ownerId,
    },
  });

  revalidatePath("/admin");
  redirectWithAdminMessage("adminNotice", mode === "ban" ? "Login propriétaire bloqué." : "Login propriétaire réactivé.");
}

export async function updateAdminUserAuthAction(formData: FormData) {
  const supabase = await createClient();
  const actor = await requireSuperadmin(supabase);
  const serviceSupabase = await createServiceClient();

  const userId = String(formData.get("userId") ?? "");
  const workspaceId = optionalText(formData.get("workspaceId"));
  const mode = String(formData.get("mode") ?? "");

  if (!userId) redirectWithAdminMessage("adminError", "Utilisateur manquant.");
  if (userId === actor.id) redirectWithAdminMessage("adminError", "Vous ne pouvez pas désactiver votre propre compte superadmin.");
  if (mode !== "ban" && mode !== "unban") redirectWithAdminMessage("adminError", "Action invalide.");

  const { error } = await serviceSupabase.auth.admin.updateUserById(userId, {
    ban_duration: mode === "ban" ? "876000h" : "none",
  });
  if (error) redirectWithAdminMessage("adminError", error.message);

  if (workspaceId) {
    await serviceSupabase.from("activity_log").insert({
      workspace_id: workspaceId,
      action: mode === "ban" ? "superadmin.user_banned" : "superadmin.user_unbanned",
      metadata: {
        actor_id: actor.id,
        actor_email: actor.email,
        user_id: userId,
      },
    });
  }

  revalidatePath("/admin");
  redirectWithAdminMessage("adminNotice", mode === "ban" ? "Utilisateur bloqué." : "Utilisateur réactivé.");
}

export async function createWorkspaceForUserAdminAction(formData: FormData) {
  const supabase = await createClient();
  const actor = await requireSuperadmin(supabase);
  const serviceSupabase = await createServiceClient();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirectWithAdminMessage("adminError", "Utilisateur manquant.");

  const { data: userResult, error: userError } = await serviceSupabase.auth.admin.getUserById(userId);
  if (userError || !userResult.user) {
    redirectWithAdminMessage("adminError", userError?.message ?? "Utilisateur introuvable.");
  }

  const { data: existingMembership, error: membershipError } = await serviceSupabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) redirectWithAdminMessage("adminError", membershipError.message);
  if (existingMembership) redirectWithAdminMessage("adminNotice", "Cet utilisateur a déjà un workspace.");

  const displayName =
    typeof userResult.user.user_metadata?.full_name === "string"
      ? userResult.user.user_metadata.full_name
      : null;
  const fallbackName = userResult.user.email?.split("@")[0] || "Cabinet";
  const workspaceName = displayName?.trim() || fallbackName;

  const { data: ownedWorkspace, error: ownedError } = await serviceSupabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedError) redirectWithAdminMessage("adminError", ownedError.message);

  let workspace = ownedWorkspace;
  if (!workspace) {
    const { data: createdWorkspace, error: createError } = await serviceSupabase
      .from("workspaces")
      .insert({
        owner_id: userId,
        name: workspaceName,
        plan: "solo",
        account_status: "active",
        subscription_status: "manual",
        subscription_source: "manual",
      })
      .select("id, name")
      .single();

    if (createError || !createdWorkspace) {
      redirectWithAdminMessage("adminError", createError?.message ?? "Workspace non créé.");
    }
    workspace = createdWorkspace;
  }

  const { error: memberError } = await serviceSupabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
      invited_by: actor.id,
    });

  if (memberError && !memberError.message.toLowerCase().includes("duplicate")) {
    redirectWithAdminMessage("adminError", memberError.message);
  }

  const { error: profileError } = await serviceSupabase
    .from("firm_profile")
    .upsert({
      workspace_id: workspace.id,
      firm_name: workspace.name,
      updated_at: new Date().toISOString(),
    });

  if (profileError) redirectWithAdminMessage("adminError", profileError.message);

  await serviceSupabase.from("activity_log").insert({
    workspace_id: workspace.id,
    action: "superadmin.workspace_repaired",
    metadata: {
      actor_id: actor.id,
      actor_email: actor.email,
      user_id: userId,
      user_email: userResult.user.email,
    },
  });

  revalidatePath("/admin");
  redirectWithAdminMessage("adminNotice", `Workspace créé pour ${userResult.user.email ?? userId}.`);
}
