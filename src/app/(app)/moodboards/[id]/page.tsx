import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { signInspirationItems } from "@/lib/storage/signed-images";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, Pencil } from "lucide-react";
import { MoodboardBoard } from "@/components/moodboards/moodboard-board";
import { MoodboardEditSheet } from "@/components/moodboards/moodboard-edit-sheet";
import type { InspirationItem } from "@/components/projects/inspiration-board";

export default async function MoodboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();

  const [{ data: board }, { data: clients }] = await Promise.all([
    supabase
      .from("moodboards")
      .select("*, clients!moodboards_client_id_fkey(name)")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
  ]);

  if (!board) notFound();

  const items = await signInspirationItems(supabase, (board.items as InspirationItem[]) ?? []);
  const client = board.clients as { name: string } | null;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/moodboards">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5 text-slate-400 hover:text-slate-700">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">{board.title}</h1>
            {board.description && (
              <p className="text-sm text-slate-400 mt-0.5">{board.description}</p>
            )}
            {client && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">{client.name}</span>
              </div>
            )}
          </div>
        </div>
        <MoodboardEditSheet
          moodboard={{
            id: board.id,
            title: board.title,
            description: board.description,
            clientId: board.client_id,
          }}
          clients={clients ?? []}
          trigger={
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          }
        />
      </div>

      {/* Board */}
      <MoodboardBoard moodboardId={board.id} initialItems={items} />
    </div>
  );
}
