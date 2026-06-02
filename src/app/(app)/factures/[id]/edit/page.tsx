import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FactureForm } from "@/components/factures/facture-form";
import type { DevisItem } from "@/lib/validators/devis";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

export default async function EditFacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("factures");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();

  const [{ data: facture }, { data: clients }, { data: projects }] = await Promise.all([
    supabase.from("factures").select("*").eq("id", id).eq("workspace_id", workspaceId).single(),
    supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
    supabase.from("projects").select("id, title, client_id").eq("workspace_id", workspaceId).is("archived_at", null).order("title"),
  ]);

  if (!facture) notFound();
  if (facture.status !== "brouillon") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-sm">{t("editDraftOnly")}</p>
        <Link href={`/factures/${id}`} className="text-primary hover:underline text-sm mt-2 inline-block">
          {t("backToFacture")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/factures/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("editTitle")}</h1>
      </div>
      <FactureForm
        clients={clients ?? []}
        projects={projects ?? []}
        factureId={id}
        defaultValues={{
          title: facture.title,
          clientId: facture.client_id,
          projectId: facture.project_id ?? undefined,
          items: facture.items as DevisItem[],
          tvaRate: parseFloat(String(facture.tva_rate)),
          notes: facture.notes ?? undefined,
          dueDate: facture.due_date ?? undefined,
        }}
      />
    </div>
  );
}
