import { z } from "zod";

export const contractGenerateSchema = z.object({
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid("Client requis"),
  type: z.enum([
    "mission_complete",
    "mission_partielle",
    "etude_faisabilite",
    "suivi_chantier",
    "autre",
  ]),
  missionScope: z.array(z.string()).min(1, "Au moins une phase requise"),
  feesMad: z.string().min(1, "Honoraires requis"),
  paymentSchedule: z.string().min(1, "Modalités de paiement requises"),
  deadlines: z.string().optional(),
  specialClauses: z.string().optional(),
});

export type ContractGenerateValues = z.infer<typeof contractGenerateSchema>;

export const contractSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
});

export const contractAiResponseSchema = z.object({
  title: z.string(),
  sections: z.array(contractSectionSchema),
});

export type ContractAiResponse = z.infer<typeof contractAiResponseSchema>;
