"use client";

import { useEffect, useState } from "react";
import { LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectsKanban } from "./projects-kanban";

interface KanbanProject {
  id: string;
  title: string;
  phase: string;
  status: string;
  fees_centimes: number | null;
  clients: { name: string } | null;
}

interface ViewToggleProps {
  projects: KanbanProject[];
  listView: React.ReactNode;
}

export function ViewToggle({ projects, listView }: ViewToggleProps) {
  const [view, setView] = useState<"list" | "kanban">("list");

  useEffect(() => {
    const t = setTimeout(() => {
      const saved = localStorage.getItem("projects-view");
      if (saved === "kanban" || saved === "list") setView(saved);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function toggle(v: "list" | "kanban") {
    setView(v);
    localStorage.setItem("projects-view", v);
  }

  return (
    <div className="space-y-4">
      <div className="ml-auto grid w-full grid-cols-2 items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white p-1 sm:flex sm:w-fit">
        <Button
          variant={view === "list" ? "default" : "ghost"}
          size="sm"
          className="h-9 px-2 sm:h-7"
          onClick={() => toggle("list")}
          title="Vue liste"
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          variant={view === "kanban" ? "default" : "ghost"}
          size="sm"
          className="h-9 px-2 sm:h-7"
          onClick={() => toggle("kanban")}
          title="Vue tableau"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      {view === "list" ? listView : <ProjectsKanban projects={projects} />}
    </div>
  );
}
