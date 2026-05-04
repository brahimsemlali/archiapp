"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ContractsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusValue = searchParams.get("status") ?? "all";
  const typeValue = searchParams.get("type") ?? "all";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        defaultValue={statusValue}
        onValueChange={(v) => update("status", v ?? "all")}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="brouillon">Brouillon</SelectItem>
          <SelectItem value="finalise">Finalisé</SelectItem>
          <SelectItem value="archive">Archivé</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={typeValue}
        onValueChange={(v) => update("type", v ?? "all")}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Type de contrat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="mission_complete">Mission complète</SelectItem>
          <SelectItem value="mission_partielle">Mission partielle</SelectItem>
          <SelectItem value="etude_faisabilite">Étude de faisabilité</SelectItem>
          <SelectItem value="suivi_chantier">Suivi de chantier</SelectItem>
          <SelectItem value="autre">Autre</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
