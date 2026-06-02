"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/workspace";

type SearchResult = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  type: "project" | "client" | "contract" | "devis" | "facture";
};

function normalizeSearchQuery(query: string) {
  return query
    .trim()
    .replace(/[(),]/g, " ")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .slice(0, 80);
}

export async function globalSearchAction(query: string): Promise<SearchResult[]> {
  const q = normalizeSearchQuery(query);
  if (q.length < 2) return [];

  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  if (!workspace.ok) return [];
  const { workspaceId } = workspace.data;

  const like = `%${q}%`;
  const [projects, clients, contracts, devisList, factures] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, address")
      .eq("workspace_id", workspaceId)
      .ilike("title", like)
      .is("archived_at", null)
      .limit(4),
    supabase
      .from("clients")
      .select("id, name, phone")
      .eq("workspace_id", workspaceId)
      .ilike("name", like)
      .is("archived_at", null)
      .limit(4),
    supabase
      .from("contracts")
      .select("id, title, type")
      .eq("workspace_id", workspaceId)
      .ilike("title", like)
      .neq("status", "archive")
      .limit(3),
    supabase
      .from("devis")
      .select("id, title, number")
      .eq("workspace_id", workspaceId)
      .or(`title.ilike.${like},number.ilike.${like}`)
      .limit(3),
    supabase
      .from("factures")
      .select("id, title, number")
      .eq("workspace_id", workspaceId)
      .or(`title.ilike.${like},number.ilike.${like}`)
      .limit(3),
  ]);

  return [
    ...(projects.data ?? []).map((p) => ({
      id: p.id,
      label: p.title,
      sub: p.address ?? undefined,
      href: `/projects/${p.id}`,
      type: "project" as const,
    })),
    ...(clients.data ?? []).map((c) => ({
      id: c.id,
      label: c.name,
      sub: c.phone ?? undefined,
      href: `/clients/${c.id}`,
      type: "client" as const,
    })),
    ...(contracts.data ?? []).map((c) => ({
      id: c.id,
      label: c.title,
      sub: c.type,
      href: `/contracts/${c.id}`,
      type: "contract" as const,
    })),
    ...(devisList.data ?? []).map((d) => ({
      id: d.id,
      label: d.title,
      sub: d.number,
      href: `/devis/${d.id}`,
      type: "devis" as const,
    })),
    ...(factures.data ?? []).map((f) => ({
      id: f.id,
      label: f.title,
      sub: f.number,
      href: `/factures/${f.id}`,
      type: "facture" as const,
    })),
  ];
}
