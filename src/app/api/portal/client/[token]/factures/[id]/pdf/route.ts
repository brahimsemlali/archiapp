import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { FacturePdf } from "@/lib/pdf/facture-template";
import { withNormalizedLogo } from "@/lib/pdf/logo";
import { resolveLocalization } from "@/lib/country-packs";
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

  const { data: facture } = await supabase
    .from("factures")
    .select("*, clients!factures_client_id_fkey(name, address, ice, cin), projects!factures_project_id_fkey(title)")
    .eq("id", id)
    .eq("workspace_id", shareLink.workspace_id)
    .eq("client_id", shareLink.resource_id)
    .neq("status", "brouillon")
    .single();

  if (!facture) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("*")
    .eq("workspace_id", shareLink.workspace_id)
    .single();

  const project = facture.projects as { title: string } | null;
  const client = facture.clients as { name: string; address?: string | null; ice?: string | null; cin?: string | null } | null;

  const element = React.createElement(FacturePdf, {
    facture: {
      number: facture.number,
      title: facture.title,
      items: facture.items as DevisItem[],
      subtotalCentimes: facture.subtotal_centimes,
      tvaRate: facture.tva_rate,
      tvaCentimes: facture.tva_centimes,
      totalCentimes: facture.total_centimes,
      notes: facture.notes,
      dueDate: facture.due_date,
      paidAt: facture.paid_at,
      createdAt: facture.created_at,
      devisId: facture.devis_id,
    },
    client,
    project: project ? { title: project.title } : null,
    firm: await withNormalizedLogo(firm),
    currency: resolveLocalization(firm).currency,
    taxLabel: resolveLocalization(firm).taxLabel,
  }) as React.ReactElement<DocumentProps>;

  const pdfBuffer = await renderToBuffer(element);
  const filename = `Facture_${facture.number.replace(/[^a-z0-9]/gi, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
