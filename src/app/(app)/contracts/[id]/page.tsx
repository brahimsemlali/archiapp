import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContractEditor } from "@/components/contracts/contract-editor";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  finalise: "Finalisé",
  archive: "Archivé",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  brouillon: "secondary",
  finalise: "default",
  archive: "outline",
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, clients(id, name), projects(id, title)")
    .eq("id", id)
    .single();

  if (!contract) notFound();

  const client = contract.clients as { id: string; name: string } | null;
  const project = contract.projects as { id: string; title: string } | null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Link href="/contracts" className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{contract.title}</h1>
            <Badge variant={STATUS_VARIANT[contract.status] ?? "secondary"}>
              {STATUS_LABELS[contract.status] ?? contract.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            {client && (
              <Link href={`/clients/${client.id}`} className="hover:underline">
                {client.name}
              </Link>
            )}
            {client && project && <span>·</span>}
            {project && (
              <Link href={`/projects/${project.id}`} className="hover:underline">
                {project.title}
              </Link>
            )}
            <span>· v{contract.version}</span>
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        ⚠️ Ce contrat est généré par IA. Faites-le valider par un juriste avant signature.
      </div>

      <ContractEditor
        contractId={id}
        initialContent={contract.content_json as { title: string; sections: { heading: string; body: string }[] } | null}
        status={contract.status}
      />
    </div>
  );
}
