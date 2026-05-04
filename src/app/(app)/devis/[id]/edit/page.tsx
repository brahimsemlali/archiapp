import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DevisForm } from "@/components/devis/devis-form";
import type { DevisItem } from "@/lib/validators/devis";

export default async function EditDevisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: devis }, { data: clients }, { data: projects }] = await Promise.all([
    supabase.from("devis").select("*").eq("id", id).single(),
    supabase.from("clients").select("id, name").is("archived_at", null).order("name"),
    supabase.from("projects").select("id, title, client_id").is("archived_at", null).order("title"),
  ]);

  if (!devis) notFound();
  if (devis.status !== "brouillon") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-sm">Seuls les devis en brouillon peuvent être modifiés.</p>
        <Link href={`/devis/${id}`} className="text-primary hover:underline text-sm mt-2 inline-block">
          Retour au devis
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/devis/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Modifier le devis</h1>
      </div>
      <DevisForm
        clients={clients ?? []}
        projects={projects ?? []}
        devisId={id}
        defaultValues={{
          title: devis.title,
          clientId: devis.client_id,
          projectId: devis.project_id ?? undefined,
          items: devis.items as DevisItem[],
          tvaRate: parseFloat(String(devis.tva_rate)),
          notes: devis.notes ?? undefined,
          validUntil: devis.valid_until ?? undefined,
        }}
      />
    </div>
  );
}
