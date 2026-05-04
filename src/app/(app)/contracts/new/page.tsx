import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContractGenerateForm } from "@/components/contracts/contract-generate-form";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; clientId?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: project }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, type")
      .is("archived_at", null)
      .order("name"),
    params.projectId
      ? supabase
          .from("projects")
          .select("id, title, client_id, phase")
          .eq("id", params.projectId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contracts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau contrat</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        ⚠️ Ce contrat est généré par IA. Faites-le valider par un juriste avant signature.
      </div>

      <div className="bg-white border rounded-lg p-6">
        <ContractGenerateForm
          clients={clients ?? []}
          preselectedProjectId={project?.id}
          preselectedClientId={project?.client_id ?? params.clientId}
        />
      </div>
    </div>
  );
}
