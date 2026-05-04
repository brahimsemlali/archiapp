import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewProjectForm } from "@/components/projects/new-project-form";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau projet</h1>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <NewProjectForm clients={clients ?? []} />
      </div>
    </div>
  );
}
