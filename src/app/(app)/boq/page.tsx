import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { BoqManager, type BoqItemRow } from "@/components/boq/boq-manager";

export default async function BoqPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);

  const [{ data: items }, { data: projects }, { data: suppliers }] = await Promise.all([
    workspaceId
      ? supabase
        .from("boq_items")
        .select("id, project_id, supplier_id, item_name, category, quantity, unit, estimated_cost_centimes, actual_cost_centimes, procurement_status, notes, projects!boq_items_project_id_fkey(title), suppliers!boq_items_supplier_id_fkey(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("projects")
        .select("id, title")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("title")
        .limit(100)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("suppliers")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("name")
        .limit(100)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="max-w-7xl space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">Opérations</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">BOQ & matériaux</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          Suivez les quantités, fournisseurs, coûts estimés/réels et statuts de procurement par projet.
        </p>
      </div>

      <BoqManager
        items={(items ?? []) as unknown as BoqItemRow[]}
        projects={projects ?? []}
        suppliers={suppliers ?? []}
      />
    </div>
  );
}
