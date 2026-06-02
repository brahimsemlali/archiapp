import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FactureForm } from "@/components/factures/facture-form";
import type { DevisItem } from "@/lib/validators/devis";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

export default async function NewFacturePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string; fromDevis?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("factures");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const [{ data: clients }, { data: projects }, { data: selectedProject }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
    supabase.from("projects").select("id, title, client_id").eq("workspace_id", workspaceId).is("archived_at", null).order("title"),
    params.projectId
      ? supabase
          .from("projects")
          .select("id, client_id")
          .eq("id", params.projectId)
          .eq("workspace_id", workspaceId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // If converting from a devis, pre-fill
  let devisDefaults: {
    title?: string;
    clientId?: string;
    projectId?: string;
    devisId?: string;
    items?: DevisItem[];
    tvaRate?: number;
    notes?: string;
  } = {};

  if (params.fromDevis) {
    const { data: devis } = await supabase
      .from("devis")
      .select("*")
      .eq("id", params.fromDevis)
      .eq("workspace_id", workspaceId)
      .single();

    if (devis) {
      devisDefaults = {
        title: devis.title,
        clientId: devis.client_id,
        projectId: devis.project_id ?? undefined,
        devisId: devis.id,
        items: devis.items as DevisItem[],
        tvaRate: parseFloat(String(devis.tva_rate)),
        notes: devis.notes ?? undefined,
      };
    }
  }
  const defaultClientId = devisDefaults.clientId ?? params.clientId ?? selectedProject?.client_id;
  const defaultProjectId = devisDefaults.projectId ?? selectedProject?.id ?? params.projectId;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/factures" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("newTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {params.fromDevis ? t("newFromDevis") : t("newSubtitle")}
          </p>
        </div>
      </div>

      <FactureForm
        clients={clients ?? []}
        projects={projects ?? []}
        defaultValues={{
          clientId: defaultClientId,
          projectId: defaultProjectId,
          ...devisDefaults,
        }}
      />
    </div>
  );
}
