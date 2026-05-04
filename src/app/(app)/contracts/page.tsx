import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { formatDate } from "@/lib/format";
import { ContractsFilters } from "@/components/contracts/contracts-filters";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  brouillon: "secondary",
  finalise: "default",
  archive: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  finalise: "Finalisé",
  archive: "Archivé",
};

const TYPE_LABELS: Record<string, string> = {
  mission_complete: "Mission complète",
  mission_partielle: "Mission partielle",
  etude_faisabilite: "Étude de faisabilité",
  suivi_chantier: "Suivi de chantier",
  autre: "Autre",
};

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("contracts")
    .select("*, clients(name), projects(title)")
    .order("created_at", { ascending: false });

  // Status filter: default to excluding archived unless explicitly requested
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  } else if (!params.status) {
    query = query.neq("status", "archive");
  }

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }

  const { data: contracts } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contrats</h1>
        <Link href="/contracts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau contrat
          </Button>
        </Link>
      </div>

      <ContractsFilters />

      {contracts && contracts.length > 0 ? (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <Link key={contract.id} href={`/contracts/${contract.id}`}>
              <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contract.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {(contract.clients as { name: string } | null)?.name ?? "—"}
                      {(contract.projects as { title: string } | null)?.title
                        ? ` · ${(contract.projects as { title: string }).title}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {TYPE_LABELS[contract.type] ?? contract.type} · {formatDate(contract.created_at)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[contract.status] ?? "secondary"}>
                    {STATUS_LABELS[contract.status] ?? contract.status}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun contrat ne correspond à ces critères.</p>
          <Link href="/contracts/new">
            <Button variant="outline" className="mt-4">Générer un contrat avec IA</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
