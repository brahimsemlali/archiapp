import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { MoodboardPdf } from "@/lib/pdf/moodboard-template";
import { normalizeMoodboardImages } from "@/lib/pdf/moodboard-images";
import { normalizeLogo } from "@/lib/pdf/logo";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { InspirationItem } from "@/components/projects/inspiration-board";
import { requireActiveWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const { data: board } = await supabase
    .from("moodboards")
    .select("id, title, description, items, clients!moodboards_client_id_fkey(name)")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!board) return NextResponse.json({ error: "Moodboard introuvable." }, { status: 404 });

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, architect_name, logo_url, phone, email")
    .eq("workspace_id", workspaceId)
    .single();

  const [normalized, logoDataUri] = await Promise.all([
    normalizeMoodboardImages(supabase, board.items as InspirationItem[]),
    normalizeLogo(firm?.logo_url),
  ]);
  const client = board.clients as unknown as { name: string } | null;

  const element = React.createElement(MoodboardPdf, {
    title: board.title,
    description: board.description,
    clientName: client?.name ?? null,
    generatedAt: new Date().toISOString(),
    firm,
    logoDataUri,
    images: normalized.images,
    failedCount: normalized.failed,
  }) as React.ReactElement<DocumentProps>;

  const pdfBuffer = await renderToBuffer(element);
  const safeTitle = board.title.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").slice(0, 60) || "moodboard";
  const filename = `Moodboard_${safeTitle}.pdf`;
  const uint8 = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
