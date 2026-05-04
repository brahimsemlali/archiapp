"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useTransition } from "react";

export function ClientsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("clients");
  const [, startTransition] = useTransition();

  const type = searchParams.get("type") ?? "all";

  const updateSearch = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams);
      if (q) params.set("q", q);
      else params.delete("q");
      startTransition(() => router.push(`/clients?${params.toString()}`));
    },
    [router, searchParams]
  );

  const updateType = useCallback(
    (newType: string) => {
      const params = new URLSearchParams(searchParams);
      if (newType === "all") params.delete("type");
      else params.set("type", newType);
      startTransition(() => router.push(`/clients?${params.toString()}`));
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("search")}
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => updateSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        {["all", "particulier", "societe"].map((v) => (
          <Button
            key={v}
            variant={type === v ? "default" : "outline"}
            size="sm"
            onClick={() => updateType(v)}
          >
            {v === "all" ? "Tous" : v === "particulier" ? t("particulier") : t("societe")}
          </Button>
        ))}
      </div>
    </div>
  );
}
