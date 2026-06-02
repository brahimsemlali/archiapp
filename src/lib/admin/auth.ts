import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function superadminEmails(): Set<string> {
  return new Set(
    (process.env.SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getSuperadminUser(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!user || !email || !superadminEmails().has(email)) return null;
  return user;
}

export async function requireSuperadmin(supabase: SupabaseServerClient) {
  const user = await getSuperadminUser(supabase);
  if (!user) throw new Error("Accès superadmin requis.");
  return user;
}
