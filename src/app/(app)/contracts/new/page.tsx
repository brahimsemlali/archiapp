import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContractGenerateForm } from "@/components/contracts/contract-generate-form";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; clientId?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("contracts");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const [{ data: clients }, { data: projects }, { data: project }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, type")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("projects")
      .select("id, title, client_id, phase")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("title"),
    params.projectId
      ? supabase
          .from("projects")
          .select("id, title, client_id, phase")
          .eq("id", params.projectId)
          .eq("workspace_id", workspaceId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contracts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("new")}</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        {t("disclaimer")}
      </div>

      <div className="bg-white border rounded-lg p-6">
        <ContractGenerateForm
          clients={clients ?? []}
          projects={projects ?? []}
          preselectedProjectId={project?.id}
          preselectedClientId={project?.client_id ?? params.clientId}
        />
      </div>
    </div>
  );
}
