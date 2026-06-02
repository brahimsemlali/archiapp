import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditProjectForm } from "@/components/projects/edit-project-form";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("projects");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();

  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).eq("workspace_id", workspaceId).single(),
    supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
  ]);

  if (!project) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("editTitle")}</h1>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <EditProjectForm
          project={project}
          clients={clients ?? []}
        />
      </div>
    </div>
  );
}
