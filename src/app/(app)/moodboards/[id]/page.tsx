import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { signInspirationItems } from "@/lib/storage/signed-images";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, Pencil, Download } from "lucide-react";
import { MoodboardBoard } from "@/components/moodboards/moodboard-board";
import { MoodboardEditSheet } from "@/components/moodboards/moodboard-edit-sheet";
import type { InspirationItem } from "@/components/projects/inspiration-board";
import { formatDate } from "@/lib/format";

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
    <div className="max-w-7xl space-y-6">
      {/* Editorial header */}
      <header className="relative overflow-hidden rounded-3xl">
        <div className="mb-atmos" aria-hidden />
        <div className="relative z-10 px-1 pt-2 pb-5">
          <Link
            href="/moodboards"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Tous les moodboards
          </Link>

          <div className="mt-3.5 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary/75">
                Planche d&apos;inspiration
              </p>
              <h1 className="page-title mt-1.5 truncate text-[2.2rem] leading-[1.05] text-slate-900">{board.title}</h1>
              {board.description && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{board.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-slate-400">
                <span>
                  {items.length} référence{items.length !== 1 ? "s" : ""}
                </span>
                {client && (
                  <span className="flex items-center gap-1.5 normal-case tracking-normal text-slate-500">
                    <Users className="h-3 w-3" />
                    {client.name}
                  </span>
                )}
                <span>MàJ {formatDate(board.updated_at)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {items.length > 0 && (
                <a href={`/api/moodboards/${board.id}/pdf`} download>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Télécharger le PDF
                  </Button>
                </a>
              )}
              <MoodboardEditSheet
                moodboard={{
                  id: board.id,
                  title: board.title,
                  description: board.description,
                  clientId: board.client_id,
                }}
                clients={clients ?? []}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <MoodboardBoard moodboardId={board.id} initialItems={items} />
    </div>
  );
}
