import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ArchiDesk — AI Operating System for Architecture Firms",
  description:
    "Manage architecture projects, phases, budgets, files, site reports, approvals, invoices, and AI summaries in one professional workspace.",
};

export default function HomePage() {
  return <LandingPage />;
}
