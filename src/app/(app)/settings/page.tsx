import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const profile = workspace
    ? (await supabase.from("firm_profile").select("*").eq("workspace_id", workspace.id).single()).data
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Paramètres du cabinet</h1>
      <div className="bg-white border rounded-lg p-6">
        <SettingsForm profile={profile} />
      </div>
    </div>
  );
}
