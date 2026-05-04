import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPdf } from "@/lib/pdf/contract-template";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contract) return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace || contract.workspace_id !== workspace.id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, architect_name, address, phone, email, ice, rc")
    .eq("workspace_id", workspace.id)
    .single();

  const content = contract.content_json as { title: string; sections: { heading: string; body: string }[] } | null;

  if (!content) {
    return NextResponse.json({ error: "Contenu du contrat manquant." }, { status: 400 });
  }

  const element = React.createElement(ContractPdf, { content, firm }) as React.ReactElement<DocumentProps>;
  const pdfBuffer = await renderToBuffer(element);

  const filename = `${content.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
  const uint8 = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
