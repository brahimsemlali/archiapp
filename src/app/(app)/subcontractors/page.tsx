import { createClient } from "@/lib/supabase/server";
import { SubcontractorsList } from "@/components/subcontractors/subcontractors-list";
import { getWorkspaceId } from "@/lib/workspace";
import { redirect } from "next/navigation";

export default async function SubcontractorsPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const { data: subcontractors } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">Opérations</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">Sous-traitants</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          {(subcontractors ?? []).length} partenaire{(subcontractors ?? []).length !== 1 ? "s" : ""} référencé{(subcontractors ?? []).length !== 1 ? "s" : ""}
        </p>
      </div>
      <SubcontractorsList subcontractors={subcontractors ?? []} />
    </div>
  );
}
