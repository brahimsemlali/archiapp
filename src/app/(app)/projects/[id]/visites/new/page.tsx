import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VisiteForm } from "@/components/visites/visite-form";
import { getWorkspaceId } from "@/lib/workspace";
import { getPlanLimits } from "@/lib/billing/plans";

export default async function NewVisitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const workspaceId = await getWorkspaceId(supabase, user?.id);
  if (!workspaceId) notFound();

  const [{ data: project }, { data: workspace }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single(),
    supabase.from("workspaces").select("plan").eq("id", workspaceId).single(),
  ]);

  if (!project) notFound();
  const aiEnabled = getPlanLimits(workspace?.plan).aiEnabled;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visite de chantier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{project.title}</p>
        </div>
      </div>
      <VisiteForm projectId={id} projectTitle={project.title} aiEnabled={aiEnabled} />
    </div>
  );
}
