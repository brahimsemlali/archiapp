import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { DevisPdf } from "@/lib/pdf/devis-template";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { DevisItem } from "@/lib/validators/devis";
import { requireWorkspaceAccountActive } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;
  const supabase = await createServiceClient();

  const { data: shareLink } = await supabase
    .from("share_links")
    .select("workspace_id, resource_id, expires_at")
    .eq("token", token)
    .eq("resource_type", "client")
    .single();

  if (!shareLink) return NextResponse.json({ error: "Lien invalide." }, { status: 403 });
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return NextResponse.json({ error: "Lien expiré." }, { status: 403 });
  }
  const workspaceStatus = await requireWorkspaceAccountActive(supabase, shareLink.workspace_id);
  if (!workspaceStatus.ok) return NextResponse.json({ error: workspaceStatus.error }, { status: 403 });

  const { data: devis } = await supabase
    .from("devis")
    .select("*, clients!devis_client_id_fkey(name, address, ice, cin), projects!devis_project_id_fkey(title)")
    .eq("id", id)
    .eq("workspace_id", shareLink.workspace_id)
    .eq("client_id", shareLink.resource_id)
    .neq("status", "brouillon")
    .single();

  if (!devis) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, architect_name, address, phone, email, ice, logo_url")
    .eq("workspace_id", shareLink.workspace_id)
    .single();

  const project = devis.projects as { title: string } | null;
  const client = devis.clients as { name: string; address?: string | null; ice?: string | null; cin?: string | null } | null;

  const element = React.createElement(DevisPdf, {
    devis: {
      number: devis.number,
      title: devis.title,
      items: devis.items as DevisItem[],
      subtotalCentimes: devis.subtotal_centimes,
      tvaRate: devis.tva_rate,
      tvaCentimes: devis.tva_centimes,
      totalCentimes: devis.total_centimes,
      notes: devis.notes,
      validUntil: devis.valid_until,
      createdAt: devis.created_at,
    },
    client,
    project: project ? { title: project.title } : null,
    firm,
  }) as React.ReactElement<DocumentProps>;

  const pdfBuffer = await renderToBuffer(element);
  const filename = `Devis_${devis.number.replace(/[^a-z0-9]/gi, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
