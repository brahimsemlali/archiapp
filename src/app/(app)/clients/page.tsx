import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Building2, Phone, Mail } from "lucide-react";
import { ClientsSearch } from "@/components/clients/clients-search";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const t = await getTranslations("clients");
  const params = await searchParams;

  let query = supabase
    .from("clients")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,phone.ilike.%${params.q}%`);
  }
  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }

  const { data: clients } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link href="/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("new")}
          </Button>
        </Link>
      </div>

      <ClientsSearch />

      {clients && clients.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {client.type === "societe" ? (
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <p className="font-medium text-sm leading-tight">{client.name}</p>
                  </div>
                  <Badge variant={client.type === "societe" ? "default" : "secondary"} className="shrink-0 text-xs">
                    {client.type === "societe" ? t("societe") : t("particulier")}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {client.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{params.q ? t("emptySearch") : t("empty")}</p>
        </div>
      )}
    </div>
  );
}
