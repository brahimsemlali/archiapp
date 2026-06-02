import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DevisForm } from "@/components/devis/devis-form";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

export default async function NewDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("devis");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const [{ data: clients }, { data: projects }, { data: selectedProject }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
    supabase.from("projects").select("id, title, client_id").eq("workspace_id", workspaceId).is("archived_at", null).order("title"),
    params.projectId
      ? supabase
          .from("projects")
          .select("id, client_id")
          .eq("id", params.projectId)
          .eq("workspace_id", workspaceId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const defaultClientId = params.clientId ?? selectedProject?.client_id;
  const defaultProjectId = selectedProject?.id ?? params.projectId;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/devis" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("newTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("newSubtitle")}</p>
        </div>
      </div>

      <DevisForm
        clients={clients ?? []}
        projects={projects ?? []}
        defaultValues={{
          clientId: defaultClientId,
          projectId: defaultProjectId,
        }}
      />
    </div>
  );
}
