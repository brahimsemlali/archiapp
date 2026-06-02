import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { planFromVariantId, verifyLemonSignature } from "@/lib/billing/lemonsqueezy";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      workspace_id?: string;
      user_id?: string;
      plan?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

function textAttr(attrs: Record<string, unknown>, key: string): string | null {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberAttr(attrs: Record<string, unknown>, key: string): number | null {
  const value = attrs[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapSubscriptionStatus(status: string | null): {
  subscriptionStatus: "manual" | "trialing" | "active" | "past_due" | "paused" | "cancelled";
  accountStatus: "active" | "cancelled";
} {
  if (status === "on_trial") return { subscriptionStatus: "trialing", accountStatus: "active" };
  if (status === "active") return { subscriptionStatus: "active", accountStatus: "active" };
  if (status === "paused") return { subscriptionStatus: "paused", accountStatus: "active" };
  if (status === "past_due" || status === "unpaid") return { subscriptionStatus: "past_due", accountStatus: "active" };
  if (status === "cancelled" || status === "expired") return { subscriptionStatus: "cancelled", accountStatus: "cancelled" };
  return { subscriptionStatus: "manual", accountStatus: "active" };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "unknown";
  const attrs = payload.data?.attributes ?? {};
  const workspaceId = payload.meta?.custom_data?.workspace_id;
  const explicitPlan = payload.meta?.custom_data?.plan;
  const variantId = numberAttr(attrs, "variant_id") ?? textAttr(attrs, "variant_id");
  const plan = explicitPlan === "studio" || explicitPlan === "agence"
    ? explicitPlan
    : planFromVariantId(variantId);

  if (!workspaceId) {
    return NextResponse.json({ ok: true, ignored: "missing workspace_id" });
  }

  if (!eventName.startsWith("subscription_")) {
    return NextResponse.json({ ok: true, ignored: eventName });
  }

  const status = textAttr(attrs, "status");
  const { subscriptionStatus, accountStatus } = mapSubscriptionStatus(status);
  const subscriptionId = payload.data?.id ?? textAttr(attrs, "first_subscription_item_id");
  const customerIdNumber = numberAttr(attrs, "customer_id");
  const customerId = textAttr(attrs, "customer_id") ?? (customerIdNumber === null ? null : String(customerIdNumber));
  const currentPeriodEnd = textAttr(attrs, "renews_at") ?? textAttr(attrs, "ends_at") ?? textAttr(attrs, "trial_ends_at");

  const supabase = await createServiceClient();
  const nextPlan = accountStatus === "cancelled" ? "solo" : plan ?? "studio";

  const { error } = await supabase
    .from("workspaces")
    .update({
      plan: nextPlan,
      account_status: accountStatus,
      subscription_status: subscriptionStatus,
      subscription_source: "lemonsqueezy",
      lemon_squeezy_customer_id: customerId,
      lemon_squeezy_subscription_id: subscriptionId ?? null,
      current_period_end: currentPeriodEnd,
      suspended_at: null,
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "billing.lemonsqueezy_webhook",
    metadata: {
      event_name: eventName,
      status,
      subscription_status: subscriptionStatus,
      account_status: accountStatus,
      plan: nextPlan,
      subscription_id: subscriptionId ?? null,
      customer_id: customerId,
    },
  });

  return NextResponse.json({ ok: true });
}
