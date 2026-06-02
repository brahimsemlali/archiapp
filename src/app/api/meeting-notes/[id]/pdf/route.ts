import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { MeetingPdf } from "@/lib/pdf/meeting-pdf-template";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { requireActiveWorkspace } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const workspace = await requireActiveWorkspace(supabase, user.id);
  if (!workspace.ok) return NextResponse.json({ error: workspace.error }, { status: 403 });
  const { workspaceId } = workspace.data;

  const { data: meeting } = await supabase
    .from("meeting_notes")
    .select("id, title, meeting_date, meeting_type, attendees, duration_planned_minutes, duration_actual_minutes, raw_notes, summary, decisions, risks, extracted_tasks, ai_generated, pv_signed_at, pv_signer_name, pv_svg_data, project_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!meeting) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  const [{ data: firm }, { data: project }] = await Promise.all([
    supabase
      .from("firm_profile")
      .select("firm_name, architect_name, address, phone, email, ice, logo_url")
      .eq("workspace_id", workspaceId)
      .single(),
    meeting.project_id
      ? supabase.from("projects").select("title, address").eq("id", meeting.project_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const meetingData = {
    ...meeting,
    meeting_type: (meeting.meeting_type as string) ?? "reunion_client",
    attendees: Array.isArray(meeting.attendees) ? (meeting.attendees as string[]) : [],
    decisions: Array.isArray(meeting.decisions) ? (meeting.decisions as string[]) : [],
    risks: Array.isArray(meeting.risks) ? (meeting.risks as string[]) : [],
    extracted_tasks: Array.isArray(meeting.extracted_tasks)
      ? (meeting.extracted_tasks as Array<{ title: string; assigneeHint?: string; dueDate?: string; priority: string }>)
      : [],
    duration_planned_minutes: meeting.duration_planned_minutes as number | null,
    duration_actual_minutes: meeting.duration_actual_minutes as number | null,
    raw_notes: meeting.raw_notes as string | null,
    pv_signed_at: meeting.pv_signed_at as string | null,
    pv_signer_name: meeting.pv_signer_name as string | null,
    pv_svg_data: meeting.pv_svg_data as string | null,
  };

  const element = React.createElement(MeetingPdf, {
    meeting: meetingData,
    project: project ?? null,
    firm: firm ?? null,
  }) as React.ReactElement<DocumentProps>;

  const pdfBuffer = await renderToBuffer(element);
  const filename = `CR_${meeting.title.replace(/[^a-z0-9]/gi, "_")}_${meeting.meeting_date}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
