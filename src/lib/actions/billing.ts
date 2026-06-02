"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createLemonCheckout } from "@/lib/billing/lemonsqueezy";
import type { WorkspacePlan } from "@/lib/billing/plans";
import { requireWorkspaceRole, WORKSPACE_ADMIN_ROLES } from "@/lib/workspace";

function parsePaidPlan(value: FormDataEntryValue | null): Exclude<WorkspacePlan, "solo"> | null {
  if (value === "studio" || value === "agence") return value;
  return null;
}

export async function createBillingCheckoutAction(formData: FormData): Promise<void> {
  const plan = parsePaidPlan(formData.get("plan"));
  if (!plan) redirect("/settings?tab=billing&billingError=Plan%20invalide");

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase, WORKSPACE_ADMIN_ROLES);
  if (!context.ok) {
    redirect(`/settings?tab=billing&billingError=${encodeURIComponent(context.error)}`);
  }

  const { user, workspaceId } = context.data;
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();

  let checkoutUrl: string;
  try {
    const checkout = await createLemonCheckout({
      plan,
      workspaceId,
      userId: user.id,
      userEmail: user.email,
      workspaceName: workspace?.name,
    });
    checkoutUrl = checkout.url;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout impossible.";
    redirect(`/settings?tab=billing&billingError=${encodeURIComponent(message)}`);
  }

  redirect(checkoutUrl);
}
