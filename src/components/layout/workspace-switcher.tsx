"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { switchWorkspaceAction } from "@/lib/actions/workspace";

export interface WorkspaceSwitcherItem {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceSwitcherProps {
  activeWorkspaceId?: string | null;
  workspaces: WorkspaceSwitcherItem[];
}

export function WorkspaceSwitcher({ activeWorkspaceId, workspaces }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (workspaces.length <= 1 || !activeWorkspaceId) return null;

  function handleChange(nextWorkspaceId: string | null | undefined) {
    if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceId) return;

    startTransition(async () => {
      const result = await switchWorkspaceAction(nextWorkspaceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Espace de travail changé.");
      router.refresh();
    });
  }

  return (
    <div className="px-2.5 pb-2">
      <Select value={activeWorkspaceId} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger className="h-auto min-h-10 rounded-xl border-[#E5E7EB] bg-[#F7F8FA]/85 px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:bg-white">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#ADAB9D]">
                Cabinet actif
              </span>
              <SelectValue />
            </span>
          </span>
        </SelectTrigger>
        <SelectContent align="start" className="min-w-56">
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{workspace.name}</span>
                <span className="text-[11px] capitalize text-muted-foreground">{workspace.role}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
