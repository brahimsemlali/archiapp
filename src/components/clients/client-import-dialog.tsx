"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importClientsAction, type ClientImportRow } from "@/lib/actions/clients";

const HEADER_MAP: Record<string, keyof ClientImportRow> = {
  name: "name",
  nom: "name",
  client: "name",
  "raison sociale": "name",
  type: "type",
  statut: "type",
  phone: "phone",
  telephone: "phone",
  téléphone: "phone",
  tel: "phone",
  email: "email",
  mail: "email",
  address: "address",
  adresse: "address",
  ice: "ice",
  cin: "cin",
  notes: "notes",
  note: "notes",
};

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      i += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(header: string): string {
  const delimiters = [",", ";", "\t"];
  return delimiters.reduce((best, delimiter) => (
    header.split(delimiter).length > header.split(best).length ? delimiter : best
  ), ",");
}

function parseCsv(text: string): ClientImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]!);
  const headers = splitCsvLine(lines[0]!, delimiter).map((header) => (
    HEADER_MAP[header.trim().toLowerCase()] ?? null
  ));

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    return cells.reduce<ClientImportRow>((row, cell, index) => {
      const key = headers[index];
      if (key) row[key] = cell;
      return row;
    }, {});
  }).filter((row) => Object.values(row).some(Boolean));
}

export function ClientImportDialog() {
  const t = useTranslations("clients.import");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ClientImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const previewRows = useMemo(() => rows.slice(0, 4), [rows]);

  async function handleFile(file: File | undefined) {
    setErrors([]);
    setRows([]);
    setFileName(file?.name ?? null);
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setErrors([t("parseError")]);
      return;
    }
    setRows(parsed);
  }

  function handleImport() {
    startTransition(async () => {
      const result = await importClientsAction(rows);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setErrors(result.data.errors);
      if (result.data.inserted > 0) {
        toast.success(t("success", { count: result.data.inserted }));
        setRows([]);
        setFileName(null);
        inputRef.current?.form?.reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(t("nothingImported"));
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-3 text-[13px] font-medium rounded-lg border-[#E5E7EB] text-[#1E293B]"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        {t("button")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block rounded-xl border border-dashed border-[#D8D5CB] bg-[#F7F8FA] p-5 cursor-pointer hover:border-[#ADAB9D] transition-colors">
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-[#2F8F5C]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0B1220]">
                    {fileName ?? t("chooseFile")}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-0.5">{t("formatHint")}</p>
                </div>
              </div>
            </label>

            {previewRows.length > 0 && (
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-[#F7F8FA] border-b border-[#E5E7EB] flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-[#0B1220]">{t("preview")}</p>
                  <p className="text-[11px] text-[#64748B]">{t("rowsDetected", { count: rows.length })}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead className="text-[#64748B]">
                      <tr className="border-b border-[#F1F5F9]">
                        <th className="px-3 py-2 font-medium">{t("name")}</th>
                        <th className="px-3 py-2 font-medium">{t("type")}</th>
                        <th className="px-3 py-2 font-medium">{t("phone")}</th>
                        <th className="px-3 py-2 font-medium">{t("email")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={`${row.name}-${index}`} className="border-b last:border-b-0 border-[#F1F5F9]">
                          <td className="px-3 py-2 text-[#0B1220]">{row.name || "—"}</td>
                          <td className="px-3 py-2 text-[#64748B]">{row.type || "particulier"}</td>
                          <td className="px-3 py-2 text-[#64748B]">{row.phone || "—"}</td>
                          <td className="px-3 py-2 text-[#64748B]">{row.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className="rounded-lg border border-[#C75B2E]/25 bg-[#FCEFE6] px-3 py-2">
                <p className="text-[12px] font-semibold text-[#C75B2E]">{t("warnings")}</p>
                <ul className="mt-1 space-y-0.5">
                  {errors.slice(0, 4).map((error) => (
                    <li key={error} className="text-[11.5px] text-[#7A3B23]">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                {t("cancel")}
              </Button>
              <Button onClick={handleImport} disabled={pending || rows.length === 0}>
                {pending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {t("submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
