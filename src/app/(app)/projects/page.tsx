import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { getServerFormatters } from "@/lib/formatters-server";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ViewToggle } from "@/components/projects/view-toggle";
import { PHASE_COLORS } from "@/lib/constants";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; phase?: string; status?: string; client?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("projects");
  const tp = await getTranslations("phase");
  const ts = await getTranslations("status.project");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  const { formatDate } = await getServerFormatters();
  if (!workspaceId) redirect("/onboarding");

  const [projectsRes, clientsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients!projects_client_id_fkey(id, name)")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
  ]);

  let projects = projectsRes.data ?? [];

  if (params.q) {
    const q = params.q.toLowerCase();
    projects = projects.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.clients as { name: string } | null)?.name.toLowerCase().includes(q)
    );
  }
  if (params.phase && params.phase !== "all") {
    projects = projects.filter((p) => p.phase === params.phase);
  }
  if (params.status && params.status !== "all") {
    projects = projects.filter((p) => p.status === params.status);
  }
  if (params.client && params.client !== "all") {
    projects = projects.filter(
      (p) => (p.clients as { id: string; name: string } | null)?.id === params.client
    );
  }

  const clients = clientsRes.data ?? [];
  const hasFilters = params.q || (params.phase && params.phase !== "all") ||
    (params.status && params.status !== "all") || (params.client && params.client !== "all");

  const kanbanProjects = projects.map((p) => ({
    id: p.id,
    title: p.title,
    phase: p.phase,
    status: p.status,
    fees_centimes: p.fees_centimes,
    clients: (p.clients as { id: string; name: string } | null)
      ? { name: (p.clients as { id: string; name: string }).name }
      : null,
  }));

  const listView = projects.length > 0 ? (
    <div className="space-y-2">
      {projects.map((project) => {
        const client = project.clients as { name: string } | null;
        return (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#0B1220] truncate">{project.title}</p>
                  <p className="text-[12px] text-[#64748B] mt-0.5">
                    {client?.name ?? "—"} · {formatDate(project.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${PHASE_COLORS[project.phase] ?? "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {(["esquisse","aps","apd","pc","dce","chantier","reception","termine"] as const).includes(project.phase as "esquisse"|"aps"|"apd"|"pc"|"dce"|"chantier"|"reception"|"termine") ? tp(project.phase as "esquisse"|"aps"|"apd"|"pc"|"dce"|"chantier"|"reception"|"termine") : project.phase}
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold bg-[#F1F5F9] text-[#64748B]">
                    {(["actif","en_attente","suspendu","archive"] as const).includes(project.status as "actif"|"en_attente"|"suspendu"|"archive") ? ts(project.status as "actif"|"en_attente"|"suspendu"|"archive") : project.status}
                  </span>
                </div>
              </div>
              {project.address && (
                <p className="text-[11.5px] text-[#64748B] mt-2 truncate">{project.address}</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  ) : (
    <div className="text-center py-20">
      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
        <FolderOpen className="h-5 w-5 text-[#ADAB9D]" />
      </div>
      <p className="text-[13.5px] text-[#64748B] mb-4">
        {hasFilters ? t("emptyFilters") : t("empty")}
      </p>
      {!hasFilters && (
        <Link href="/projects/new">
          <Button variant="outline" size="sm" className="border-[#E5E7EB] text-[#1E293B]">{t("createFirst")}</Button>
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-1">{t("eyebrow")}</p>
          <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
          <p className="text-[13.5px] text-[#64748B] mt-1">
            {projects.length === 1 ? t("activeCount", { count: projects.length }) : t("activeCountPlural", { count: projects.length })}
          </p>
        </div>
        <Link href="/projects/new" className="shrink-0">
          <Button size="sm" className="h-10 w-full bg-[#0B1220] hover:bg-[#2D2E22] text-[#F7F8FA] border-0 shadow-none px-3 text-[13px] font-medium rounded-lg sm:h-8 sm:w-auto">
            {t("new")}
          </Button>
        </Link>
      </div>

      <ProjectsFilters clients={clients} />

      <ViewToggle projects={kanbanProjects} listView={listView} />
    </div>
  );
}
