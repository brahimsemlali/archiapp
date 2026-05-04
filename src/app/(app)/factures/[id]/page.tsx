import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";
import { FactureDetail } from "@/components/factures/facture-detail";
import type { DevisItem } from "@/lib/validators/devis";

export default async function FactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: facture } = await supabase
    .from("factures")
    .select("*, clients(id, name, address, ice, cin), projects(id, title)")
    .eq("id", id)
    .single();

  if (!facture) notFound();

  const { data: firmProfile } = await supabase
    .from("firm_profile")
    .select("firm_name, architect_name, address, ice, email, phone")
    .eq("workspace_id", facture.workspace_id)
    .single();

  const client = (facture.clients as unknown) as { id: string; name: string; address?: string; ice?: string; cin?: string } | null;
  const project = (facture.projects as unknown) as { id: string; title: string } | null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/factures" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{facture.title}</h1>
            <span className="text-sm text-muted-foreground font-mono">{facture.number}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client && <Link href={`/clients/${client.id}`} className="hover:underline">{client.name}</Link>}
            {project && <> · <Link href={`/projects/${project.id}`} className="hover:underline">{project.title}</Link></>}
            {" · "}{formatDate(facture.created_at)}
          </p>
        </div>
      </div>

      <FactureDetail
        facture={{
          id: facture.id,
          number: facture.number,
          title: facture.title,
          status: facture.status as "brouillon" | "envoyee" | "payee" | "annulee",
          items: facture.items as DevisItem[],
          subtotalCentimes: facture.subtotal_centimes,
          tvaRate: parseFloat(String(facture.tva_rate)),
          tvaCentimes: facture.tva_centimes,
          totalCentimes: facture.total_centimes,
          notes: facture.notes,
          dueDate: facture.due_date,
          paidAt: facture.paid_at,
          createdAt: facture.created_at,
          devisId: facture.devis_id,
        }}
        client={client}
        project={project}
        firmProfile={firmProfile}
      />
    </div>
  );
}
