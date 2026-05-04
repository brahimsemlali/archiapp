"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectsFiltersProps {
  clients: { id: string; name: string }[];
}

export function ProjectsFilters({ clients }: ProjectsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phaseValue = searchParams.get("phase") ?? "all";
  const statusValue = searchParams.get("status") ?? "all";
  const clientValue = searchParams.get("client") ?? "all";

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

  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => update("q", value), 300);
    },
    [update]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Rechercher un projet..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="max-w-xs"
      />

      <Select
        defaultValue={phaseValue}
        onValueChange={(v) => update("phase", v ?? "all")}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Phase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les phases</SelectItem>
          <SelectItem value="esquisse">Esquisse</SelectItem>
          <SelectItem value="aps">APS</SelectItem>
          <SelectItem value="apd">APD</SelectItem>
          <SelectItem value="pc">PC</SelectItem>
          <SelectItem value="dce">DCE</SelectItem>
          <SelectItem value="chantier">Chantier</SelectItem>
          <SelectItem value="reception">Réception</SelectItem>
          <SelectItem value="termine">Terminé</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={statusValue}
        onValueChange={(v) => update("status", v ?? "all")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="actif">Actif</SelectItem>
          <SelectItem value="en_attente">En attente</SelectItem>
          <SelectItem value="suspendu">Suspendu</SelectItem>
          <SelectItem value="termine">Terminé</SelectItem>
        </SelectContent>
      </Select>

      {clients.length > 0 && (
        <Select
          defaultValue={clientValue}
          onValueChange={(v) => update("client", v ?? "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
