import "server-only";

import crypto from "crypto";
import type { WorkspacePlan } from "@/lib/billing/plans";
import { PLAN_LIMITS } from "@/lib/billing/plans";

const LEMON_API_URL = "https://api.lemonsqueezy.com/v1";

type CheckoutInput = {
  workspaceId: string;
  userId: string;
  userEmail?: string | null;
  workspaceName?: string | null;
  plan: Exclude<WorkspacePlan, "solo">;
};

type LemonCheckoutResponse = {
  data?: {
    attributes?: {
      url?: string;
    };
  };
  errors?: Array<{ detail?: string; title?: string }>;
};

export function getLemonVariantId(plan: WorkspacePlan): string | null {
  const envName = PLAN_LIMITS[plan].lemonSqueezyVariantEnv;
  if (!envName) return null;
  return process.env[envName]?.trim() || null;
}

export function isLemonBillingConfigured(): boolean {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
    process.env.LEMON_SQUEEZY_STORE_ID &&
    getLemonVariantId("studio") &&
    getLemonVariantId("agence")
  );
}

export async function createLemonCheckout(input: CheckoutInput): Promise<{ url: string }> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const variantId = getLemonVariantId(input.plan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!apiKey || !storeId || !variantId) {
    throw new Error("La facturation LemonSqueezy n'est pas encore configurée.");
  }

  const response = await fetch(`${LEMON_API_URL}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          product_options: {
            redirect_url: `${appUrl}/settings?tab=billing&checkout=success`,
            receipt_button_text: "Retourner à ArchiDesk",
            receipt_link_url: `${appUrl}/settings?tab=billing`,
            enabled_variants: [Number(variantId)],
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
            discount: true,
            subscription_preview: true,
            locale: "fr",
          },
          checkout_data: {
            email: input.userEmail ?? undefined,
            name: input.workspaceName ?? undefined,
            custom: {
              workspace_id: input.workspaceId,
              user_id: input.userId,
              plan: input.plan,
            },
          },
          test_mode: process.env.LEMON_SQUEEZY_TEST_MODE === "true",
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: String(storeId),
            },
          },
          variant: {
            data: {
              type: "variants",
              id: String(variantId),
            },
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({})) as LemonCheckoutResponse;
  const url = payload.data?.attributes?.url;

  if (!response.ok || !url) {
    const message = payload.errors?.[0]?.detail ?? payload.errors?.[0]?.title ?? "Checkout LemonSqueezy impossible.";
    throw new Error(message);
  }

  return { url };
}

export function verifyLemonSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function planFromVariantId(variantId: unknown): Exclude<WorkspacePlan, "solo"> | null {
  const normalized = String(variantId ?? "");
  if (normalized && normalized === getLemonVariantId("studio")) return "studio";
  if (normalized && normalized === getLemonVariantId("agence")) return "agence";
  return null;
}
