import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectNotesEditor } from "@/components/projects/project-notes-editor";

export default async function ProjectNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, notes")
    .eq("id", id)
    .single();

  if (!project) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">{project.title}</p>
        </div>
      </div>

      <ProjectNotesEditor projectId={id} initialNotes={project.notes ?? ""} />
    </div>
  );
}
