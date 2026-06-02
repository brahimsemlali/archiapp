import { createClient } from "@/lib/supabase/server";
import { SuppliersPage } from "@/components/fournisseurs/suppliers-page";
import { getWorkspaceId } from "@/lib/workspace";
import { redirect } from "next/navigation";

export default async function FournisseursPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const [{ data: suppliers }, { data: items }] = await Promise.all([
    supabase.from("suppliers").select("*").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
    supabase.from("catalog_items").select("*, suppliers!catalog_items_supplier_id_fkey(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="pt-1">
        <p className="eyebrow mb-1">Achats</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">Fournisseurs & Catalogue</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          Référencez vos fournisseurs et constituez votre catalogue de prix matériaux.
        </p>
      </div>
      <SuppliersPage initialSuppliers={suppliers ?? []} initialItems={items ?? []} />
    </div>
  );
}
