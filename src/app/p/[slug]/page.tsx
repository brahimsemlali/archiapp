import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Building2, MapPin, Phone, Mail, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import type { InspirationItem } from "@/components/projects/inspiration-board";

const PHASE_LABELS: Record<string, string> = {
  esquisse: "Esquisse", aps: "APS", apd: "APD", pc: "PC",
  dce: "DCE", chantier: "Chantier", reception: "Réception", termine: "Terminé",
};

const TYPE_LABELS: Record<string, string> = {
  villa: "Villa", appartement: "Appartement", immeuble: "Immeuble",
  commercial: "Commercial", renovation: "Rénovation", amenagement: "Aménagement", autre: "Autre",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const { data: firm } = await supabase
    .from("firm_profile")
    .select("firm_name, architect_name, portfolio_tagline")
    .eq("slug", slug)
    .eq("portfolio_enabled", true)
    .single();

  if (!firm) return { title: "Portfolio" };
  return {
    title: `${firm.firm_name ?? firm.architect_name ?? "Cabinet"} · Portfolio`,
    description: firm.portfolio_tagline ?? `Architecte au Maroc — ${firm.architect_name ?? ""}`,
  };
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: firm } = await supabase
    .from("firm_profile")
    .select("*")
    .eq("slug", slug)
    .eq("portfolio_enabled", true)
    .single();

  if (!firm) notFound();

  // Featured projects or last 6 terminated/active projects
  let projectQuery = supabase
    .from("projects")
    .select("id, title, type, phase, address, surface_m2, metadata")
    .eq("workspace_id", firm.workspace_id)
    .is("archived_at", null);

  if (firm.portfolio_featured_project_ids?.length) {
    projectQuery = projectQuery.in("id", firm.portfolio_featured_project_ids);
  } else {
    projectQuery = projectQuery.in("status", ["actif", "termine"]).order("created_at", { ascending: false }).limit(6);
  }

  const { data: projects } = await projectQuery;
  const projectsWithPortfolioInspirations = (projects ?? []).map((project) => {
    const metadata = (project.metadata as Record<string, unknown> | null) ?? {};
    const inspirations = ((metadata.inspirations as InspirationItem[]) ?? []).filter((item) => !item.path);

    return {
      ...project,
      metadata: {
        ...metadata,
        inspirations,
      },
    };
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {firm.logo_url ? (
              <Image src={firm.logo_url} alt={firm.firm_name ?? "Logo"} width={40} height={40} className="rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-bold text-slate-900">{firm.firm_name ?? firm.architect_name}</p>
              {firm.firm_name && firm.architect_name && (
                <p className="text-xs text-slate-400">{firm.architect_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {firm.phone && (
              <a href={`tel:${firm.phone}`} className="text-slate-500 hover:text-slate-900 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {firm.phone}
              </a>
            )}
            {firm.email && (
              <a href={`mailto:${firm.email}`} className="hidden sm:flex text-slate-500 hover:text-slate-900 items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {firm.email}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">
            {firm.portfolio_tagline ?? `Architecture & Design au Maroc`}
          </h1>
          {firm.portfolio_specialties?.length ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {firm.portfolio_specialties.map((spec: string) => (
                <span key={spec} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-medium">
                  {spec}
                </span>
              ))}
            </div>
          ) : null}
          {firm.address && (
            <p className="text-sm text-slate-400 mt-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {firm.address}
            </p>
          )}
        </div>

        {/* Projects grid */}
        {projectsWithPortfolioInspirations.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Réalisations</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projectsWithPortfolioInspirations.map((project) => {
                const inspirations = (project.metadata as { inspirations?: { url: string; caption?: string }[] } | null)?.inspirations;
                const coverUrl = inspirations?.[0]?.url;

                return (
                  <div key={project.id} className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300">
                    {coverUrl ? (
                      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                        <Image
                          src={coverUrl}
                          alt={project.title}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <Building2 className="h-10 w-10 text-slate-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="font-semibold text-slate-900">{project.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">{TYPE_LABELS[project.type] ?? project.type}</span>
                        {project.address && (
                          <>
                            <span className="text-slate-200">·</span>
                            <span className="text-xs text-slate-400 truncate">{project.address}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {project.surface_m2 && (
                          <span className="text-xs text-slate-400">{project.surface_m2} m²</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${project.phase === "termine" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                          {PHASE_LABELS[project.phase] ?? project.phase}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-200" />
            <p className="text-sm">Aucune réalisation publiée pour l&apos;instant.</p>
          </div>
        )}

        {/* Contact section */}
        {(firm.phone || firm.email || firm.address) && (
          <div className="mt-16 border-t pt-12">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Contact</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {firm.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Adresse</p>
                    <p className="text-sm text-slate-700">{firm.address}</p>
                  </div>
                </div>
              )}
              {firm.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Téléphone</p>
                    <a href={`tel:${firm.phone}`} className="text-sm text-slate-700 hover:text-primary">{firm.phone}</a>
                  </div>
                </div>
              )}
              {firm.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Email</p>
                    <a href={`mailto:${firm.email}`} className="text-sm text-slate-700 hover:text-primary">{firm.email}</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-300">
          <span>© {new Date().getFullYear()} {firm.firm_name ?? firm.architect_name}</span>
          <Link href="/" className="hover:text-slate-500 transition-colors flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Propulsé par ArchiDesk
          </Link>
        </div>
      </footer>
    </div>
  );
}
