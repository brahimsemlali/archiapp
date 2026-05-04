import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DevisForm } from "@/components/devis/devis-form";

export default async function NewDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase.from("clients").select("id, name").is("archived_at", null).order("name"),
    supabase.from("projects").select("id, title, client_id").is("archived_at", null).order("title"),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/devis" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau devis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Créez une proposition commerciale professionnelle</p>
        </div>
      </div>

      <DevisForm
        clients={clients ?? []}
        projects={projects ?? []}
        defaultValues={{
          clientId: params.clientId,
          projectId: params.projectId,
        }}
      />
    </div>
  );
}
