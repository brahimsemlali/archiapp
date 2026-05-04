import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { formatDate } from "@/lib/format";

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

export default async function ContractsPage() {
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, clients(name), projects(title)")
    .neq("status", "archive")
    .order("created_at", { ascending: false });

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
          <p>Aucun contrat pour l'instant.</p>
          <Link href="/contracts/new">
            <Button variant="outline" className="mt-4">Générer un contrat avec IA</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
