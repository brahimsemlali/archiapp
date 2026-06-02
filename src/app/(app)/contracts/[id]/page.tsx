import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContractEditor } from "@/components/contracts/contract-editor";
import { formatDate } from "@/lib/format";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("contracts");
  const ts = await getTranslations("status.contract");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();

  const [{ data: contract }, { data: signature }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*, clients!contracts_client_id_fkey(id, name), projects!contracts_project_id_fkey(id, title)")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single(),
    supabase
      .from("signatures")
      .select("id, signer_name, signed_at")
      .eq("contract_id", id)
      .maybeSingle(),
  ]);

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
              {(["brouillon","finalise","archived"] as const).includes(contract.status as "brouillon"|"finalise"|"archived") ? ts(contract.status as "brouillon"|"finalise"|"archived") : contract.status}
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
        {t("disclaimer")}
      </div>

      {signature && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{t("signed", { name: signature.signer_name, date: formatDate(signature.signed_at) })}</span>
        </div>
      )}

      <ContractEditor
        contractId={id}
        initialContent={contract.content_json as { title: string; sections: { heading: string; body: string }[] } | null}
        status={contract.status}
      />
    </div>
  );
}
