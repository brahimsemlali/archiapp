import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerFormatters } from "@/lib/formatters-server";
import { DevisDetail } from "@/components/devis/devis-detail";
import type { DevisItem } from "@/lib/validators/devis";
import { getWorkspaceId } from "@/lib/workspace";

export default async function DevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  const { formatDate } = await getServerFormatters();
  if (!workspaceId) notFound();

  const { data: devis } = await supabase
    .from("devis")
    .select("*, clients!devis_client_id_fkey(id, name, address, ice, cin), projects!devis_project_id_fkey(id, title)")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!devis) notFound();

  const { data: firmProfile } = await supabase
    .from("firm_profile")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  const client = devis.clients as { id: string; name: string; address?: string; ice?: string; cin?: string } | null;
  const project = devis.projects as { id: string; title: string } | null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/devis" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{devis.title}</h1>
            <span className="text-sm text-muted-foreground font-mono">{devis.number}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client && (
              <Link href={`/clients/${client.id}`} className="hover:underline">{client.name}</Link>
            )}
            {project && (
              <> · <Link href={`/projects/${project.id}`} className="hover:underline">{project.title}</Link></>
            )}
            {" · "}{formatDate(devis.created_at)}
          </p>
        </div>
      </div>

      <DevisDetail
        devis={{
          id: devis.id,
          number: devis.number,
          title: devis.title,
          status: devis.status as "brouillon" | "envoye" | "accepte" | "refuse" | "expire",
          items: devis.items as DevisItem[],
          subtotalCentimes: devis.subtotal_centimes,
          tvaRate: parseFloat(String(devis.tva_rate)),
          tvaCentimes: devis.tva_centimes,
          totalCentimes: devis.total_centimes,
          notes: devis.notes,
          validUntil: devis.valid_until,
          createdAt: devis.created_at,
        }}
        client={client}
        project={project}
        firmProfile={firmProfile}
      />
    </div>
  );
}
