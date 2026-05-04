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
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  name: text("name").notNull(),
  plan: workspacePlanEnum("plan").notNull().default("solo"),
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

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id),
  clientId: uuid("client_id").references(() => clients.id),
  action: text("action").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  shareLinks: many(shareLinks),
  activityLog: many(activityLog),
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
