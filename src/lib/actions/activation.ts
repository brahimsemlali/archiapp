"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

function futureDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function nextDocumentNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  type: "devis" | "facture",
  prefix: "DEV" | "FA"
) {
  const { data, error } = await supabase.rpc("next_workspace_document_number", {
    p_workspace_id: workspaceId,
    p_document_type: type,
    p_prefix: prefix,
  });

  if (error || typeof data !== "string") {
    return `${prefix}-DEMO-${new Date().getFullYear()}-001`;
  }

  return data;
}

export async function createDemoWorkspaceDataAction(): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId, user } = context.data;

  const [{ count: clientsCount }, { count: projectsCount }] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("archived_at", null),
  ]);

  if ((clientsCount ?? 0) > 0 || (projectsCount ?? 0) > 0) {
    return { ok: false, error: "Les données exemple sont réservées aux workspaces vides." };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      workspace_id: workspaceId,
      name: "Client Démo - Villa Anfa",
      type: "particulier",
      phone: "+212 6 00 00 00 00",
      email: "client.demo@archidesk.ma",
      address: "Casablanca, Maroc",
      notes: "Client exemple pour tester le portail, les devis, les factures et le suivi projet.",
    })
    .select("id")
    .single();

  if (clientError || !client) {
    return { ok: false, error: clientError ? dbError(clientError) : "Client exemple non créé." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      client_id: client.id,
      title: "Villa Anfa - Rénovation complète",
      type: "villa",
      address: "Anfa, Casablanca",
      surface_m2: 420,
      phase: "apd",
      status: "actif",
      budget_estimate_centimes: 180000000,
      fees_centimes: 14500000,
      start_date: futureDate(-20),
      target_end_date: futureDate(120),
      notes: "Projet démo avec phases, budget, tâches, BOQ, visite de chantier et documents à approuver.",
      metadata: {
        demo: true,
        health_reason: "Projet sain, mais permis et validations client à surveiller cette semaine.",
        checklist: {
          esquisse: [{ label: "Moodboard validé", done: true }, { label: "Programme client confirmé", done: true }],
          apd: [{ label: "Plans APD", done: true }, { label: "Estimation budget", done: false }],
          pc: [{ label: "Dossier permis", done: false }],
        },
      },
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return { ok: false, error: projectError ? dbError(projectError) : "Projet exemple non créé." };
  }

  const devisNumber = await nextDocumentNumber(supabase, workspaceId, "devis", "DEV");
  const factureNumber = await nextDocumentNumber(supabase, workspaceId, "facture", "FA");
  const items = [
    { id: crypto.randomUUID(), description: "Mission architecturale APD + permis", quantity: 1, unit: "forfait", unitPriceCentimes: 8500000 },
    { id: crypto.randomUUID(), description: "Suivi chantier mensuel", quantity: 4, unit: "mois", unitPriceCentimes: 1500000 },
  ];
  const subtotalCentimes = 14500000;
  const tvaCentimes = 2900000;
  const totalCentimes = 17400000;

  const { data: devis } = await supabase
    .from("devis")
    .insert({
      workspace_id: workspaceId,
      client_id: client.id,
      project_id: project.id,
      number: devisNumber,
      title: "Mission architecturale - Villa Anfa",
      status: "envoye",
      items,
      subtotal_centimes: subtotalCentimes,
      tva_rate: 20,
      tva_centimes: tvaCentimes,
      total_centimes: totalCentimes,
      valid_until: futureDate(20),
      notes: "Devis exemple prêt à être consulté dans le portail client.",
    })
    .select("id")
    .single();

  await supabase.from("factures").insert({
    workspace_id: workspaceId,
    client_id: client.id,
    project_id: project.id,
    devis_id: devis?.id ?? null,
    number: factureNumber,
    title: "Acompte démarrage - Villa Anfa",
    status: "envoyee",
    items: [items[0]],
    subtotal_centimes: 8500000,
    tva_rate: 20,
    tva_centimes: 1700000,
    total_centimes: 10200000,
    due_date: futureDate(12),
    notes: "Facture exemple pour tester les relances et le suivi de trésorerie.",
  });

  await Promise.all([
    supabase.from("tasks").insert([
      {
        workspace_id: workspaceId,
        client_id: client.id,
        project_id: project.id,
        assigned_to: user.id,
        title: "Finaliser dossier permis",
        priority: "haute",
        status: "en_cours",
        due_date: futureDate(7),
      },
      {
        workspace_id: workspaceId,
        client_id: client.id,
        project_id: project.id,
        assigned_to: user.id,
        title: "Envoyer plan RDC pour validation client",
        priority: "moyenne",
        status: "a_faire",
        due_date: futureDate(3),
      },
    ]),
    supabase.from("time_entries").insert([
      {
        workspace_id: workspaceId,
        project_id: project.id,
        user_id: user.id,
        phase: "apd",
        description: "Mise au point plans APD",
        duration_minutes: 210,
        date: futureDate(-2),
        billable: true,
        rate_centimes: 45000,
      },
      {
        workspace_id: workspaceId,
        project_id: project.id,
        user_id: user.id,
        phase: "pc",
        description: "Préparation dossier permis",
        duration_minutes: 135,
        date: futureDate(-1),
        billable: true,
        rate_centimes: 45000,
      },
    ]),
    supabase.from("boq_items").insert([
      {
        workspace_id: workspaceId,
        project_id: project.id,
        item_name: "Revêtement sol grand format",
        category: "Finitions",
        quantity: 180,
        unit: "m²",
        estimated_cost_centimes: 7200000,
        actual_cost_centimes: 0,
        procurement_status: "quoted",
      },
      {
        workspace_id: workspaceId,
        project_id: project.id,
        item_name: "Menuiserie aluminium",
        category: "Menuiserie",
        quantity: 22,
        unit: "u",
        estimated_cost_centimes: 13200000,
        actual_cost_centimes: 0,
        procurement_status: "not_started",
      },
    ]),
    supabase.from("site_visits").insert({
      workspace_id: workspaceId,
      project_id: project.id,
      title: "Visite de coordination initiale",
      visit_date: futureDate(-4),
      weather: "Ensoleillé",
      attendees: "Architecte, client, entreprise gros oeuvre",
      summary: "Le chantier est propre. Les réservations techniques doivent être confirmées avant la prochaine intervention.",
      observations: [
        { zone: "RDC", text: "Vérifier réservation climatisation avant coulage.", severity: "medium" },
      ],
    }),
    supabase.from("site_issues").insert({
      workspace_id: workspaceId,
      project_id: project.id,
      created_by: user.id,
      assigned_to: user.id,
      title: "Réservations techniques à confirmer",
      description: "Coordonner avec le BET avant validation du plan d'exécution.",
      zone: "RDC",
      status: "open",
      priority: "high",
      due_date: futureDate(5),
    }),
  ]);

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: project.id,
    client_id: client.id,
    action: "activation.demo_workspace_created",
    metadata: { project_title: "Villa Anfa - Rénovation complète" },
  });

  revalidatePath("/dashboard");
  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/devis");
  revalidatePath("/factures");
  return { ok: true, data: undefined };
}
