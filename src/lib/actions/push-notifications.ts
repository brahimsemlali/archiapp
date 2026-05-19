"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/workspace";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export async function savePushSubscriptionAction(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<Result<void>> {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  if (!workspace.ok) return { ok: false, error: workspace.error };
  const { workspaceId } = workspace.data;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({
      workspace_id: workspaceId,
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

  if (error) return { ok: false, error: dbError(error) };
  return { ok: true, data: undefined };
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  if (!workspace.ok) return { ok: false, error: workspace.error };
  const { workspaceId } = workspace.data;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { ok: false, error: dbError(error) };
  return { ok: true, data: undefined };
}

export async function getVapidPublicKeyAction(): Promise<Result<{ key: string | null }>> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
  return { ok: true, data: { key } };
}
