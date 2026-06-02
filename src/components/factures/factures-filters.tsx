"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FacturesFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusValue = searchParams.get("status") ?? "all";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Select defaultValue={statusValue} onValueChange={(v) => update("status", v ?? "all")}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les factures</SelectItem>
          <SelectItem value="brouillon">Brouillon</SelectItem>
          <SelectItem value="envoyee">Envoyée</SelectItem>
          <SelectItem value="payee">Payée</SelectItem>
          <SelectItem value="annulee">Annulée</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
