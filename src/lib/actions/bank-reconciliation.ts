"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface BankLine {
  date: string;
  description: string;
  amount_centimes: number;
  reference?: string;
}

export interface MatchedLine {
  bankLine: BankLine;
  factureId: string | null;
  factureNumber: string | null;
  factureAmount: number | null;
  confidence: "exact" | "close" | "none";
}

export async function parseBankCsvAction(csv: string): Promise<Result<{ lines: BankLine[] }>> {
  const lines: BankLine[] = [];
  const rows = csv.split(/\r?\n/).filter((r) => r.trim());

  for (const row of rows) {
    // Support comma and semicolon delimiters
    const cols = row.includes(";") ? row.split(";") : row.split(",");
    if (cols.length < 3) continue;

    // Try to find a date column (DD/MM/YYYY or YYYY-MM-DD)
    const dateCol = cols.find((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(c.trim()) || /^\d{4}-\d{2}-\d{2}$/.test(c.trim()));
    if (!dateCol) continue;

    const dateStr = dateCol.trim();
    const isoDate = dateStr.includes("/")
      ? dateStr.split("/").reverse().join("-")
      : dateStr;

    // Find amount column (positive number, treat as credit)
    let amountCentimes: number | null = null;
    for (const col of cols) {
      const cleaned = col.trim().replace(/\s/g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) {
        amountCentimes = Math.round(num * 100);
        break;
      }
    }
    if (!amountCentimes) continue;

    // Description is the longest text col
    const descCol = cols
      .filter((c) => isNaN(parseFloat(c.replace(",", "."))) && c.trim().length > 3 && !/^\d{2}\/\d{2}\/\d{4}$/.test(c.trim()))
      .sort((a, b) => b.length - a.length)[0] ?? "";

    lines.push({
      date: isoDate,
      description: descCol.trim(),
      amount_centimes: amountCentimes,
    });
  }

  return { ok: true, data: { lines } };
}

export async function matchBankLinesAction(lines: BankLine[]): Promise<Result<{ matches: MatchedLine[] }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: factures } = await supabase
    .from("factures")
    .select("id, number, total_centimes, status, due_date")
    .eq("workspace_id", workspaceId)
    .eq("status", "envoyee")
    .limit(500);

  const unpaid = factures ?? [];
  const matches: MatchedLine[] = lines.map((line) => {
    // Exact amount match
    const exact = unpaid.find((f) => f.total_centimes === line.amount_centimes);
    if (exact) {
      return { bankLine: line, factureId: exact.id, factureNumber: exact.number, factureAmount: exact.total_centimes, confidence: "exact" };
    }
    // Within 5% (rounding, partial payment, fees)
    const close = unpaid.find((f) => Math.abs(f.total_centimes - line.amount_centimes) / f.total_centimes < 0.05);
    if (close) {
      return { bankLine: line, factureId: close.id, factureNumber: close.number, factureAmount: close.total_centimes, confidence: "close" };
    }
    return { bankLine: line, factureId: null, factureNumber: null, factureAmount: null, confidence: "none" };
  });

  return { ok: true, data: { matches } };
}

export async function markFacturePaidFromBankAction(factureId: string, paidAt: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase
    .from("factures")
    .update({ status: "payee", paid_at: paidAt })
    .eq("id", factureId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/factures");
  revalidatePath("/rapports");
  return { ok: true, data: undefined };
}
