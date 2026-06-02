import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User, Building2, Phone, Mail } from "lucide-react";
import { ClientsSearch } from "@/components/clients/clients-search";
import { ClientImportDialog } from "@/components/clients/client-import-dialog";
import { getWorkspaceId } from "@/lib/workspace";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const t = await getTranslations("clients");
  const params = await searchParams;
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  let query = supabase
    .from("clients")
    .select("*")
    .eq("workspace_id", workspaceId)
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
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="eyebrow mb-1">Portefeuille</p>
          <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
          <p className="text-[13.5px] text-[#64748B] mt-1">
            {clients?.length ?? 0} client{(clients?.length ?? 0) !== 1 ? "s" : ""} actif{(clients?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <ClientImportDialog />
          <Link href="/clients/new">
            <Button size="sm" className="bg-[#0B1220] hover:bg-[#2D2E22] text-[#F7F8FA] border-0 shadow-none h-8 px-3 text-[13px] font-medium rounded-lg">
              + {t("new")}
            </Button>
          </Link>
        </div>
      </div>

      <ClientsSearch />

      {clients && clients.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => {
            const initials = client.name
              .split(" ")
              .slice(0, 2)
              .map((w: string) => w[0])
              .join("")
              .toUpperCase();

            return (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer space-y-4">
                  {/* Avatar + name row */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#CBD5E1] to-[#B5B0A0] flex items-center justify-center shrink-0">
                      <span className="text-[13px] font-semibold text-[#0B1220]">{initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="section-title text-[14.5px] text-[#0B1220] truncate">{client.name}</p>
                      <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full ${client.type === "societe" ? "bg-[#E9ECFF] text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                        {client.type === "societe" ? t("societe") : t("particulier")}
                      </span>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                        <Phone className="h-3 w-3 shrink-0 text-[#ADAB9D]" />
                        {client.phone}
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                        <Mail className="h-3 w-3 shrink-0 text-[#ADAB9D]" />
                        {client.email}
                      </div>
                    )}
                    {!client.phone && !client.email && (
                      <p className="text-[12px] text-[#ADAB9D]">Aucun contact renseigné</p>
                    )}
                  </div>

                  {/* Type icon bottom right */}
                  <div className="flex justify-end">
                    {client.type === "societe" ? (
                      <Building2 className="h-3.5 w-3.5 text-[#ADAB9D]" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-[#ADAB9D]" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
            <User className="h-5 w-5 text-[#ADAB9D]" />
          </div>
          <p className="text-[13.5px] text-[#64748B]">{params.q ? t("emptySearch") : t("empty")}</p>
        </div>
      )}
    </div>
  );
}
