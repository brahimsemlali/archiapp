import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { DevisPdf } from "@/lib/pdf/devis-template";
import { withNormalizedLogo } from "@/lib/pdf/logo";
import { resolveLocalization } from "@/lib/country-packs";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { DevisItem } from "@/lib/validators/devis";
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

  const { data: devis } = await supabase
    .from("devis")
    .select("*, clients!devis_client_id_fkey(name, address, ice, cin), projects!devis_project_id_fkey(title)")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!devis) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("*")
    .eq("workspace_id", workspaceId)
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
    firm: await withNormalizedLogo(firm),
    currency: resolveLocalization(firm).currency,
    taxLabel: resolveLocalization(firm).taxLabel,
  }) as React.ReactElement<DocumentProps>;

  const pdfBuffer = await renderToBuffer(element);
  const filename = `Devis_${devis.number.replace(/[^a-z0-9]/gi, "_")}.pdf`;
  const uint8 = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
