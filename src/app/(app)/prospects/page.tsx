import { createClient } from "@/lib/supabase/server";
import { ProspectsPipeline } from "@/components/prospects/prospects-pipeline";
import { getWorkspaceId } from "@/lib/workspace";
import { redirect } from "next/navigation";

export default async function ProspectsPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">Commercial</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">Pipeline commercial</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          Suivez vos prospects du premier contact à la signature du contrat.
        </p>
      </div>
      <ProspectsPipeline initialProspects={prospects ?? []} />
    </div>
  );
}
