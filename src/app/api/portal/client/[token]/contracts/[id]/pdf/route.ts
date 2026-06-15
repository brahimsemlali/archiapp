import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPdf } from "@/lib/pdf/contract-template";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { requireWorkspaceAccountActive } from "@/lib/workspace";

// Public client-portal contract PDF — lets the client READ a finalized contract
// before signing. Mirrors the devis/facture portal PDF routes: validate the
// client share link, then scope the contract to that link's workspace + client.
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

  const { data: contract } = await supabase
    .from("contracts")
    .select("content_json, status")
    .eq("id", id)
    .eq("workspace_id", shareLink.workspace_id)
    .eq("client_id", shareLink.resource_id)
    .eq("status", "finalise")
    .single();

  if (!contract) return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });

  const content = contract.content_json as { title: string; sections: { heading: string; body: string }[] } | null;
  if (!content) return NextResponse.json({ error: "Contenu du contrat manquant." }, { status: 400 });

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, architect_name, address, phone, email, ice, rc")
    .eq("workspace_id", shareLink.workspace_id)
    .single();

  const element = React.createElement(ContractPdf, { content, firm }) as React.ReactElement<DocumentProps>;
  const pdfBuffer = await renderToBuffer(element);
  const filename = `${content.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
