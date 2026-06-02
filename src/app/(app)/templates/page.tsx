import { createClient } from "@/lib/supabase/server";
import { TemplatesPage } from "@/components/templates/templates-page";
import { getWorkspaceId } from "@/lib/workspace";

export default async function TemplatesPageRoute() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);

  const { data: templates } = workspaceId
    ? await supabase.from("templates").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="pt-1">
        <p className="eyebrow mb-1">Bibliothèque</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">Modèles</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          Modèles de devis, clauses contractuelles et checklists réutilisables.
        </p>
      </div>
      <TemplatesPage initialTemplates={templates ?? []} />
    </div>
  );
}
