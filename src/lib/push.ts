import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PushPayload {
  title: string;
  body: string;
  href?: string;
}

interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:admin@archidesk.ma";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  vapidConfigured = true;
  return true;
}

export async function sendPushNotification(
  sub: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  if (!ensureVapid()) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch {
    return false;
  }
}

const PUSH_CONCURRENCY = 10;

// Broadcast a push to all subscribers in a workspace, optionally scoped to one user.
export async function notifyWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  payload: PushPayload,
  options?: { userId?: string }
): Promise<void> {
  if (!ensureVapid()) return;

  let query = supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("workspace_id", workspaceId);

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data: subs } = await query;
  if (!subs?.length) return;

  const stale: string[] = [];

  for (let i = 0; i < subs.length; i += PUSH_CONCURRENCY) {
    const batch = subs.slice(i, i + PUSH_CONCURRENCY);
    await Promise.all(
      batch.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload)
          );
        } catch (err: unknown) {
          // 410 Gone = subscription expired, remove it
          if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
            stale.push(sub.endpoint);
          }
        }
      })
    );
  }

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }
}
