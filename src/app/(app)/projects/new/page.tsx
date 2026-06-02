import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("projects");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("newTitle")}</h1>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <NewProjectForm clients={clients ?? []} preselectedClientId={params.clientId} />
      </div>
    </div>
  );
}
