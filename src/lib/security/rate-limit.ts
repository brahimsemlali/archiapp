import "server-only";

import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/db-error";
import type { Result } from "@/types";

type RateLimitInput = {
  action: string;
  key: string;
  limit: number;
  windowSeconds: number;
};

function hashKey(action: string, key: string) {
  return crypto
    .createHash("sha256")
    .update(`${action}:${key.trim().toLowerCase()}`)
    .digest("hex");
}

export async function assertRateLimit(input: RateLimitInput): Promise<Result<void>> {
  if (!input.key.trim()) return { ok: false, error: "Trop de tentatives. Réessayez plus tard.", code: "rate_limited" };

  const supabase = await createServiceClient();
  const hashedKey = hashKey(input.action, input.key);
  const since = new Date(Date.now() - input.windowSeconds * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("action", input.action)
    .eq("key", hashedKey)
    .gte("created_at", since);

  if (countError) return { ok: false, error: dbError(countError) };
  if ((count ?? 0) >= input.limit) {
    return { ok: false, error: "Trop de tentatives. Réessayez plus tard.", code: "rate_limited" };
  }

  const { error: insertError } = await supabase
    .from("rate_limit_events")
    .insert({
      action: input.action,
      key: hashedKey,
    });

  if (insertError) return { ok: false, error: dbError(insertError) };

  if (Math.random() < 0.02) {
    const olderThan = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("rate_limit_events").delete().lt("created_at", olderThan);
  }

  return { ok: true, data: undefined };
}
