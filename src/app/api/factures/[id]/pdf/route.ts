import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/workspace";
import { renderToBuffer } from "@react-pdf/renderer";
import { FacturePdf } from "@/lib/pdf/facture-template";
import { withNormalizedLogo } from "@/lib/pdf/logo";
import { resolveLocalization, getFirmIdentityLines } from "@/lib/country-packs";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { DevisItem } from "@/lib/validators/devis";

type SnapshotPayload = {
  facture?: {
    number: string;
    title: string;
    items: DevisItem[];
    subtotal_centimes: number;
    tva_rate: number | string;
    tva_centimes: number;
    total_centimes: number;
    notes?: string | null;
    due_date?: string | null;
    paid_at?: string | null;
    created_at: string;
    devis_id?: string | null;
    clients?: { name: string; address?: string | null; ice?: string | null; cin?: string | null } | null;
    projects?: { title: string } | null;
  };
  firmProfile?: {
    firm_name?: string | null;
    architect_name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    ice?: string | null;
    iban?: string | null;
    logo_url?: string | null;
  } | null;
};

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

  const { data: sentSnapshot } = await supabase
    .from("invoice_snapshots")
    .select("payload")
    .eq("facture_id", id)
    .eq("workspace_id", workspaceId)
    .eq("snapshot_type", "sent")
    .maybeSingle();

  if (sentSnapshot?.payload) {
    const payload = sentSnapshot.payload as SnapshotPayload;
    const snapshotFacture = payload.facture;
    if (!snapshotFacture) {
      return NextResponse.json({ error: "Snapshot invalide." }, { status: 500 });
    }

    const element = React.createElement(FacturePdf, {
      facture: {
        number: snapshotFacture.number,
        title: snapshotFacture.title,
        items: snapshotFacture.items,
        subtotalCentimes: snapshotFacture.subtotal_centimes,
        tvaRate: parseFloat(String(snapshotFacture.tva_rate)),
        tvaCentimes: snapshotFacture.tva_centimes,
        totalCentimes: snapshotFacture.total_centimes,
        notes: snapshotFacture.notes,
        dueDate: snapshotFacture.due_date,
        paidAt: snapshotFacture.paid_at,
        createdAt: snapshotFacture.created_at,
        devisId: snapshotFacture.devis_id,
      },
      client: snapshotFacture.clients ?? null,
      project: snapshotFacture.projects ? { title: snapshotFacture.projects.title } : null,
      firm: await withNormalizedLogo(payload.firmProfile),
      currency: resolveLocalization(payload.firmProfile).currency,
      taxLabel: resolveLocalization(payload.firmProfile).taxLabel,
      firmIdentity: getFirmIdentityLines(payload.firmProfile),
    }) as React.ReactElement<DocumentProps>;

    const pdfBuffer = await renderToBuffer(element);
    const filename = `Facture_${snapshotFacture.number.replace(/[^a-z0-9]/gi, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Archidesk-Source": "invoice-snapshot",
      },
    });
  }

  const { data: facture } = await supabase
    .from("factures")
    .select("*, clients!factures_client_id_fkey(name, address, ice, cin), projects!factures_project_id_fkey(title)")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!facture) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("*")
    .eq("workspace_id", workspaceId)
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
    firmIdentity: getFirmIdentityLines(firm),
  }) as React.ReactElement<DocumentProps>;

  const pdfBuffer = await renderToBuffer(element);
  const filename = `Facture_${facture.number.replace(/[^a-z0-9]/gi, "_")}.pdf`;
  const uint8 = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
