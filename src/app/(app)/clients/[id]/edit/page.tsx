import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EditClientForm } from "@/components/clients/edit-client-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWorkspaceId } from "@/lib/workspace";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) notFound();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).eq("workspace_id", workspaceId).single();

  if (!client) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Modifier le client</h1>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <EditClientForm client={client} />
      </div>
    </div>
  );
}
