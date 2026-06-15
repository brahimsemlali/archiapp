"use client";

import Link from "next/link";
import { PHASE_ORDER, PHASE_COLORS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useLocalization } from "@/components/localization-provider";
import { FolderOpen } from "lucide-react";

interface KanbanProject {
  id: string;
  title: string;
  phase: string;
  status: string;
  fees_centimes: number | null;
  clients: { name: string } | null;
}

interface ProjectsKanbanProps {
  projects: KanbanProject[];
}

export function ProjectsKanban({ projects }: ProjectsKanbanProps) {
  const tPhase = useTranslations("phase");
  const { money } = useLocalization();
  const byPhase: Record<string, KanbanProject[]> = {};
  for (const phase of PHASE_ORDER) byPhase[phase] = [];
  for (const p of projects) {
    (byPhase[p.phase] ??= []).push(p);
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex gap-3 min-w-max">
        {PHASE_ORDER.map((phase) => {
          const cols = byPhase[phase] ?? [];
          return (
            <div key={phase} className="w-56 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PHASE_COLORS[phase] ?? "bg-gray-100 text-gray-700"}`}>
                  {tPhase.has(phase) ? tPhase(phase) : phase}
                </span>
                <span className="text-xs text-muted-foreground">{cols.length}</span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {cols.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="bg-white border rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer group">
                      <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {p.title}
                      </p>
                      {p.clients && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{p.clients.name}</p>
                      )}
                      {p.fees_centimes ? (
                        <p className="text-xs font-semibold text-primary mt-2">{money(p.fees_centimes)}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
                {cols.length === 0 && (
                  <div className="border-2 border-dashed rounded-xl h-16 flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-gray-200" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
