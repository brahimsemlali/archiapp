import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FactureForm } from "@/components/factures/facture-form";
import type { DevisItem } from "@/lib/validators/devis";

export default async function NewFacturePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string; fromDevis?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase.from("clients").select("id, name").is("archived_at", null).order("name"),
    supabase.from("projects").select("id, title, client_id").is("archived_at", null).order("title"),
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/factures" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle facture</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {params.fromDevis ? "Facture créée depuis un devis accepté" : "Créer une facture professionnelle"}
          </p>
        </div>
      </div>

      <FactureForm
        clients={clients ?? []}
        projects={projects ?? []}
        defaultValues={{
          clientId: params.clientId,
          projectId: params.projectId,
          ...devisDefaults,
        }}
      />
    </div>
  );
}
