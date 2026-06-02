import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { MoodboardForm } from "@/components/moodboards/moodboard-form";

export default async function NewMoodboardPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name");

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nouveau moodboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Créez un tableau d'inspiration et associez-le à un client.</p>
      </div>
      <MoodboardForm clients={clients ?? []} />
    </div>
  );
}
