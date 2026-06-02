import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  bigint,
  integer,
  numeric,
  jsonb,
  date,
  boolean,
  unique,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const workspacePlanEnum = pgEnum("workspace_plan", [
  "solo",
  "studio",
  "agence",
]);

export const profileTypeEnum = pgEnum("profile_type", [
  "architect",
  "decorator",
  "studio",
  "other",
]);

export const clientTypeEnum = pgEnum("client_type", [
  "particulier",
  "societe",
]);

export const projectTypeEnum = pgEnum("project_type", [
  "villa",
  "appartement",
  "immeuble",
  "commercial",
  "renovation",
  "amenagement",
  "autre",
]);

export const projectPhaseEnum = pgEnum("project_phase", [
  "esquisse",
  "aps",
  "apd",
  "pc",
  "dce",
  "chantier",
  "reception",
  "termine",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "actif",
  "en_attente",
  "suspendu",
  "termine",
  "archive",
]);

export const contractTypeEnum = pgEnum("contract_type", [
  "mission_complete",
  "mission_partielle",
  "etude_faisabilite",
  "suivi_chantier",
  "autre",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "brouillon",
  "finalise",
  "archive",
]);

export const shareResourceTypeEnum = pgEnum("share_resource_type", [
  "file",
  "folder",
  "project",
  "client",
]);

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
]);

export const devisStatusEnum = pgEnum("devis_status", [
  "brouillon",
  "envoye",
  "accepte",
  "refuse",
  "expire",
]);

export const factureStatusEnum = pgEnum("facture_status", [
  "brouillon",
  "envoyee",
  "payee",
  "annulee",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  name: text("name").notNull(),
  plan: workspacePlanEnum("plan").notNull().default("solo"),
  accountStatus: text("account_status").notNull().default("active"),
  subscriptionStatus: text("subscription_status").notNull().default("manual"),
  subscriptionSource: text("subscription_source").notNull().default("manual"),
  lemonSqueezyCustomerId: text("lemon_squeezy_customer_id"),
  lemonSqueezySubscriptionId: text("lemon_squeezy_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspendedReason: text("suspended_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const firmProfile = pgTable("firm_profile", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  profileType: profileTypeEnum("profile_type").notNull().default("architect"),
  firmName: text("firm_name"),
  architectName: text("architect_name"),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  ice: text("ice"),
  rc: text("rc"),
  ifNumber: text("if_number"),
  cnss: text("cnss"),
  patente: text("patente"),
  iban: text("iban"),
  slug: text("slug").unique(),
  portfolioEnabled: boolean("portfolio_enabled").notNull().default(false),
  portfolioTagline: text("portfolio_tagline"),
  portfolioSpecialties: jsonb("portfolio_specialties"),
  portfolioFeaturedProjectIds: jsonb("portfolio_featured_project_ids"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: clientTypeEnum("type").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  ice: text("ice"),
  cin: text("cin"),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  type: projectTypeEnum("type").notNull(),
  address: text("address"),
  surfaceM2: numeric("surface_m2"),
  phase: projectPhaseEnum("phase").notNull().default("esquisse"),
  status: projectStatusEnum("status").notNull().default("actif"),
  budgetEstimateCentimes: bigint("budget_estimate_centimes", { mode: "number" }),
  feesCentimes: bigint("fees_centimes", { mode: "number" }),
  startDate: date("start_date"),
  targetEndDate: date("target_end_date"),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  type: contractTypeEnum("type").notNull(),
  title: text("title").notNull(),
  contentJson: jsonb("content_json"),
  contentHtml: text("content_html"),
  aiPrompt: text("ai_prompt"),
  aiResponseRaw: text("ai_response_raw"),
  aiModel: text("ai_model"),
  status: contractStatusEnum("status").notNull().default("brouillon"),
  version: integer("version").notNull().default(1),
  parentContractId: uuid("parent_contract_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  folder: text("folder").notNull().default("Autre"),
  filename: text("filename").notNull(),
  storagePath: text("storage_path").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  version: integer("version").notNull().default(1),
  parentFileId: uuid("parent_file_id"),
  note: text("note"),
  approvalStatus: text("approval_status").notNull().default("not_required"),
  approvalRequestedAt: timestamp("approval_requested_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by"),
  approvalNote: text("approval_note"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  resourceType: shareResourceTypeEnum("resource_type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  accessedCount: integer("accessed_count").notNull().default(0),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const devis = pgTable("devis", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  number: text("number").notNull(),
  title: text("title").notNull(),
  status: devisStatusEnum("status").notNull().default("brouillon"),
  items: jsonb("items").notNull().default([]),
  subtotalCentimes: bigint("subtotal_centimes", { mode: "number" }).notNull().default(0),
  tvaRate: numeric("tva_rate").notNull().default("20.00"),
  tvaCentimes: bigint("tva_centimes", { mode: "number" }).notNull().default(0),
  totalCentimes: bigint("total_centimes", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
  validUntil: date("valid_until"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const factures = pgTable("factures", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  devisId: uuid("devis_id").references(() => devis.id, { onDelete: "set null" }),
  number: text("number").notNull(),
  title: text("title").notNull(),
  status: factureStatusEnum("status").notNull().default("brouillon"),
  items: jsonb("items").notNull().default([]),
  subtotalCentimes: bigint("subtotal_centimes", { mode: "number" }).notNull().default(0),
  tvaRate: numeric("tva_rate").notNull().default("20.00"),
  tvaCentimes: bigint("tva_centimes", { mode: "number" }).notNull().default(0),
  totalCentimes: bigint("total_centimes", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: workspaceMemberRoleEnum("role").notNull().default("member"),
  invitedBy: uuid("invited_by"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.workspaceId, t.userId)]);

export const workspaceInvites = pgTable("workspace_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: workspaceMemberRoleEnum("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").notNull(),
  status: inviteStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedBy: uuid("accepted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteVisits = pgTable("site_visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  visitDate: date("visit_date").notNull(),
  weather: text("weather"),
  attendees: text("attendees"),
  observations: jsonb("observations").notNull().default([]),
  summary: text("summary"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteIssues = pgTable("site_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  siteVisitId: uuid("site_visit_id").references(() => siteVisits.id, { onDelete: "set null" }),
  createdBy: uuid("created_by"),
  assignedTo: uuid("assigned_to"),
  title: text("title").notNull(),
  description: text("description"),
  zone: text("zone"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  dueDate: date("due_date"),
  photoUrl: text("photo_url"),
  photoPath: text("photo_path"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  assignedTo: uuid("assigned_to"),
  parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  priority: text("priority").notNull().default("moyenne"),
  status: text("status").notNull().default("a_faire"),
  metadata: jsonb("metadata").notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id),
  clientId: uuid("client_id").references(() => clients.id),
  action: text("action").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  authorId: uuid("author_id").notNull(),
  body: text("body").notNull(),
  mentions: jsonb("mentions").notNull().default([]),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const signatures = pgTable("signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }).unique(),
  signerName: text("signer_name").notNull(),
  signerEmail: text("signer_email"),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  svgData: text("svg_data").notNull(),
  ipAddress: text("ip_address"),
});

export const permitStages = pgTable("permit_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  status: text("status").notNull().default("a_faire"),
  deadline: date("deadline"),
  docs: jsonb("docs").notNull().default([]),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  userId: uuid("user_id").notNull(),
  phase: text("phase"),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  date: date("date").notNull(),
  billable: boolean("billable").notNull().default(true),
  rateCentimes: bigint("rate_centimes", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subcontractors = pgTable("subcontractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trade: text("trade"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  cnss: text("cnss"),
  rib: text("rib"),
  rating: integer("rating"),
  notes: text("notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moodboards = pgTable("moodboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  items: jsonb("items").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prospects = pgTable("prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  email: text("email"),
  source: text("source"),
  type: text("type").default("particulier"),
  stage: text("stage").notNull().default("nouveau"),
  estimatedValueCentimes: bigint("estimated_value_centimes", { mode: "number" }).default(0),
  projectType: text("project_type"),
  notes: text("notes"),
  lostReason: text("lost_reason"),
  followUpStatus: text("follow_up_status").notNull().default("none"),
  nextFollowUpDate: date("next_follow_up_date"),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  communicationNotes: text("communication_notes"),
  convertedClientId: uuid("converted_client_id").references(() => clients.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  notes: text("notes"),
  rating: integer("rating"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const catalogItems = pgTable("catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull().default("m²"),
  unitPriceCentimes: bigint("unit_price_centimes", { mode: "number" }).notNull().default(0),
  category: text("category"),
  reference: text("reference"),
  lastUpdated: date("last_updated"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const boqItems = pgTable("boq_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  category: text("category"),
  quantity: numeric("quantity").notNull().default("0"),
  unit: text("unit").notNull().default("u"),
  estimatedCostCentimes: bigint("estimated_cost_centimes", { mode: "number" }).notNull().default(0),
  actualCostCentimes: bigint("actual_cost_centimes", { mode: "number" }).notNull().default(0),
  procurementStatus: text("procurement_status").notNull().default("not_started"),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  content: jsonb("content").notNull().default({}),
  isGlobal: boolean("is_global").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recurringInvoices = pgTable("recurring_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id),
  projectId: uuid("project_id").references(() => projects.id),
  title: text("title").notNull(),
  items: jsonb("items").notNull().default([]),
  subtotalCentimes: bigint("subtotal_centimes", { mode: "number" }).notNull().default(0),
  tvaRate: numeric("tva_rate").notNull().default("20.00"),
  tvaCentimes: bigint("tva_centimes", { mode: "number" }).notNull().default(0),
  totalCentimes: bigint("total_centimes", { mode: "number" }).notNull().default(0),
  frequency: text("frequency").notNull().default("monthly"),
  nextDate: date("next_date").notNull(),
  endDate: date("end_date"),
  autoSend: boolean("auto_send").notNull().default(false),
  active: boolean("active").notNull().default(true),
  lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentReminders = pgTable("payment_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  factureId: uuid("facture_id").notNull().references(() => factures.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  channel: text("channel").notNull().default("email"),
  recipient: text("recipient"),
  message: text("message"),
  status: text("status").notNull().default("sent"),
});

export const invoiceSnapshots = pgTable("invoice_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  factureId: uuid("facture_id").notNull().references(() => factures.id, { onDelete: "cascade" }),
  snapshotType: text("snapshot_type").notNull().default("sent"),
  number: text("number").notNull(),
  payload: jsonb("payload").notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.factureId, t.snapshotType)]);

export const invoiceStatusEvents = pgTable("invoice_status_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  factureId: uuid("facture_id").notNull().references(() => factures.id, { onDelete: "cascade" }),
  previousStatus: text("previous_status"),
  nextStatus: text("next_status").notNull(),
  actorId: uuid("actor_id"),
  source: text("source").notNull().default("app"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  feature: text("feature").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalMessages = pgTable("portal_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  shareToken: text("share_token").notNull(),
  sender: text("sender").notNull(),
  senderName: text("sender_name"),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetingNotes = pgTable("meeting_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by"),
  title: text("title").notNull(),
  meetingDate: date("meeting_date").notNull(),
  meetingType: text("meeting_type").notNull().default("reunion_client"),
  attendees: jsonb("attendees").notNull().default([]),
  durationPlannedMinutes: integer("duration_planned_minutes"),
  durationActualMinutes: integer("duration_actual_minutes"),
  rawNotes: text("raw_notes").notNull(),
  summary: text("summary"),
  decisions: jsonb("decisions").notNull().default([]),
  risks: jsonb("risks").notNull().default([]),
  extractedTasks: jsonb("extracted_tasks").notNull().default([]),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  pvSignedAt: timestamp("pv_signed_at", { withTimezone: true }),
  pvSignerName: text("pv_signer_name"),
  pvSvgData: text("pv_svg_data"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentCounters = pgTable("document_counters", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  year: integer("year").notNull(),
  nextNumber: integer("next_number").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.workspaceId, t.documentType, t.year] }),
]);

export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  resourceType: text("resource_type"),
  resourceId: uuid("resource_id"),
  provider: text("provider").notNull().default("resend"),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default("sent"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimitEvents = pgTable("rate_limit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  key: text("key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const voiceNotes = pgTable("voice_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by"),
  title: text("title").notNull(),
  audioUrl: text("audio_url"),
  audioPath: text("audio_path"),
  transcript: text("transcript"),
  taskPayload: jsonb("task_payload").notNull().default({}),
  status: text("status").notNull().default("draft"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  firmProfile: one(firmProfile, {
    fields: [workspaces.id],
    references: [firmProfile.workspaceId],
  }),
  clients: many(clients),
  projects: many(projects),
  contracts: many(contracts),
  files: many(files),
  boqItems: many(boqItems),
  shareLinks: many(shareLinks),
  activityLog: many(activityLog),
  documentCounters: many(documentCounters),
  emailLog: many(emailLog),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [clients.workspaceId],
    references: [workspaces.id],
  }),
  projects: many(projects),
  contracts: many(contracts),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  contracts: many(contracts),
  files: many(files),
  siteIssues: many(siteIssues),
  boqItems: many(boqItems),
  meetingNotes: many(meetingNotes),
  voiceNotes: many(voiceNotes),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [contracts.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [contracts.projectId],
    references: [projects.id],
  }),
  client: one(clients, {
    fields: [contracts.clientId],
    references: [clients.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [files.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
}));
