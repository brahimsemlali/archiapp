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

  const count = signedMoodboards.length;

  return (
    <div className="max-w-7xl">
      {/* Editorial header band */}
      <header className="relative overflow-hidden rounded-3xl">
        <div className="mb-atmos" aria-hidden />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5 px-1 pt-2 pb-5">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary/75">
              Atelier · Inspiration
            </p>
            <h1 className="page-title mt-2 text-[2.4rem] leading-[1.04] text-slate-900">Moodboards</h1>
            <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-500">
              Composez des planches d&apos;<span className="mb-accent">inspiration</span> soignées, puis
              partagez-les avec vos clients.
            </p>
          </div>
          <Link href="/moodboards/new" className="shrink-0">
            <Button size="sm" className="gap-1.5 shadow-sm shadow-primary/25">
              <Plus className="h-3.5 w-3.5" />
              Nouveau moodboard
            </Button>
          </Link>
        </div>
        {count > 0 && (
          <div className="relative z-10 flex items-center gap-3 px-1 pb-5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-primary/60" />
              {count} tableau{count > 1 ? "x" : ""}
            </span>
          </div>
        )}
      </header>

      {count > 0 ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {signedMoodboards.map((board, i) => {
            const items = (board.items as InspirationItem[]) ?? [];
            const preview = items.slice(0, 4);

            return (
              <Link
                key={board.id}
                href={`/moodboards/${board.id}`}
                className="premium-fade-up"
                style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
              >
                <article className="mb-tile group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                  {/* accent edge on hover */}
                  <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-primary to-sky-400 transition-transform duration-300 ease-out group-hover:scale-x-100" />

                  {/* Preview grid */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                    {preview.length > 0 ? (
                      <div
                        className={`grid h-full w-full gap-0.5 ${
                          preview.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        }`}
                      >
                        {preview.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`relative overflow-hidden ${
                              preview.length === 3 && idx === 0 ? "row-span-2" : ""
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.url} alt={item.caption ?? ""} className="h-full w-full object-cover" />
                            {preview.length === 4 && idx === 3 && items.length > 4 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px]">
                                <span className="font-fraunces text-base text-white">+{items.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-9 w-9 text-slate-200" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3.5">
                    <p className="section-title truncate text-[15px] leading-tight text-slate-900">{board.title}</p>
                    {board.description && (
                      <p className="mt-1 truncate text-xs text-slate-400">{board.description}</p>
                    )}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-slate-400">
                        {items.length} image{items.length !== 1 ? "s" : ""}
                      </span>
                      {board.clients && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          <Users className="h-2.5 w-2.5" />
                          {board.clients.name}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="relative mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-8 py-20 text-center">
          <div className="mb-atmos" aria-hidden />
          <div className="relative z-10 mx-auto flex max-w-sm flex-col items-center">
            <div className="relative mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-2xl border border-slate-200" />
              <div className="absolute inset-2 rounded-xl border border-dashed border-slate-200" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-7 w-7 text-slate-300" />
              </div>
            </div>
            <h2 className="page-title text-2xl text-slate-900">
              Une toile <span className="mb-accent">vierge</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Composez votre première planche d&apos;inspiration et associez-la à un client si vous le souhaitez.
            </p>
            <Link href="/moodboards/new" className="mt-6">
              <Button size="sm" className="gap-1.5 shadow-sm shadow-primary/25">
                <Plus className="h-3.5 w-3.5" />
                Créer un moodboard
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
