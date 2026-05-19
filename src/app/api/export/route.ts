import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const workspaceId = await getWorkspaceId(supabase, user.id);
  if (!workspaceId) return new NextResponse("Workspace not found", { status: 404 });

  // Collect all data in parallel
  const [
    { data: clients },
    { data: projects },
    { data: contracts },
    { data: devis },
    { data: factures },
    { data: tasks },
    { data: siteVisits },
    { data: meetingNotes },
    { data: files },
    { data: timeEntries },
    { data: firmProfile },
    { data: activityLog },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("projects").select("*").eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("contracts").select("id, title, type, status, version, created_at, updated_at").eq("workspace_id", workspaceId),
    supabase.from("devis").select("*").eq("workspace_id", workspaceId),
    supabase.from("factures").select("*").eq("workspace_id", workspaceId),
    supabase.from("tasks").select("*").eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("site_visits").select("*").eq("workspace_id", workspaceId),
    supabase.from("meeting_notes").select("*").eq("workspace_id", workspaceId),
    supabase.from("files").select("id, filename, folder, size_bytes, mime_type, version, created_at").eq("workspace_id", workspaceId),
    supabase.from("time_entries").select("*").eq("workspace_id", workspaceId),
    supabase.from("firm_profile").select("firm_name, architect_name, address, phone, email, ice, rc, if_number, cnss, patente").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("activity_log").select("action, metadata, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(500),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    workspaceId,
    requestedBy: user.email,
    data: {
      firmProfile: firmProfile ?? null,
      clients: clients ?? [],
      projects: projects ?? [],
      contracts: contracts ?? [],
      devis: devis ?? [],
      factures: factures ?? [],
      tasks: tasks ?? [],
      siteVisits: siteVisits ?? [],
      meetingNotes: meetingNotes ?? [],
      files: files ?? [],
      timeEntries: timeEntries ?? [],
      activityLog: activityLog ?? [],
    },
  };

  const filename = `archidesk-export-${new Date().toISOString().split("T")[0]}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
