import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FileManager } from "@/components/files/file-manager";

const DEFAULT_FOLDERS = ["Plans", "Rendus", "Documents", "Photos", "Autre"];

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", id)
    .order("folder")
    .order("created_at", { ascending: false });

  type FileRow = NonNullable<typeof files>[number];
  // Group by folder, only show latest version of each filename
  const byFolder: Record<string, FileRow[]> = {};
  for (const folder of DEFAULT_FOLDERS) {
    byFolder[folder] = [];
  }

  for (const file of files ?? []) {
    if (!byFolder[file.folder]) byFolder[file.folder] = [] as FileRow[];
    // Only show files that are the latest version (no child has them as parent)
    const hasNewerVersion = (files ?? []).some(
      (f) => f.parent_file_id === file.id
    );
    if (!hasNewerVersion) {
      byFolder[file.folder]!.push(file);
    }
  }

  // Add any custom folders that exist in files but not in defaults
  for (const file of files ?? []) {
    if (!DEFAULT_FOLDERS.includes(file.folder) && !byFolder[file.folder]) {
      byFolder[file.folder] = [] as FileRow[];
    }
    if (!DEFAULT_FOLDERS.includes(file.folder)) {
      const hasNewerVersion = (files ?? []).some(
        (f) => f.parent_file_id === file.id
      );
      if (!hasNewerVersion && !byFolder[file.folder]!.find((f) => f.id === file.id)) {
        byFolder[file.folder]!.push(file);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fichiers</h1>
          <p className="text-sm text-muted-foreground">{project.title}</p>
        </div>
      </div>

      <FileManager
        projectId={id}
        filesByFolder={byFolder}
        allFiles={files ?? []}
        defaultFolders={DEFAULT_FOLDERS}
      />
    </div>
  );
}
