import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { signInspirationItems } from "@/lib/storage/signed-images";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ImageIcon, Users } from "lucide-react";
import type { Moodboard } from "@/lib/actions/moodboards";
import type { InspirationItem } from "@/components/projects/inspiration-board";

export default async function MoodboardsPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();

  const { data: moodboards } = await supabase
    .from("moodboards")
    .select("*, clients!moodboards_client_id_fkey(name)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  const signedMoodboards = await Promise.all(
    ((moodboards ?? []) as unknown as Moodboard[]).map(async (board) => ({
      ...board,
      items: await signInspirationItems(supabase, (board.items as InspirationItem[]) ?? []),
    }))
  );

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Moodboards</h1>
          <p className="text-sm text-slate-400 mt-0.5">Tableaux d'inspiration visuels pour vos projets et clients</p>
        </div>
        <Link href="/moodboards/new">
          <Button size="sm" className="gap-1.5 shadow-sm shadow-primary/20">
            <Plus className="h-3.5 w-3.5" />
            Nouveau moodboard
          </Button>
        </Link>
      </div>

      {signedMoodboards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {signedMoodboards.map((board) => {
            const items = (board.items as InspirationItem[]) ?? [];
            const preview = items.slice(0, 4);

            return (
              <Link key={board.id} href={`/moodboards/${board.id}`}>
                <div className="group bg-white border border-slate-200/60 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  {/* Preview grid */}
                  <div className="aspect-video bg-slate-50 overflow-hidden relative">
                    {preview.length > 0 ? (
                      <div className={`grid h-full w-full gap-0.5 ${
                        preview.length === 1 ? "grid-cols-1" :
                        preview.length === 2 ? "grid-cols-2" :
                        "grid-cols-2"
                      }`}>
                        {preview.map((item, i) => (
                          <div key={item.id} className={`relative overflow-hidden ${preview.length === 3 && i === 0 ? "row-span-2" : ""}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt={item.caption ?? ""}
                              className="object-cover w-full h-full"
                            />
                            {preview.length === 4 && i === 3 && items.length > 4 && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-white text-sm font-semibold">+{items.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-10 w-10 text-slate-200" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-slate-800 truncate">{board.title}</p>
                    {board.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{board.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-slate-400">{items.length} image{items.length !== 1 ? "s" : ""}</span>
                      {board.clients && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Users className="h-2.5 w-2.5" />
                          {board.clients.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <ImageIcon className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-base font-semibold text-slate-700">Aucun moodboard pour l'instant</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Créez votre premier tableau d'inspiration et associez-le à un client si vous le souhaitez.
          </p>
          <Link href="/moodboards/new" className="mt-5">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Créer un moodboard
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
