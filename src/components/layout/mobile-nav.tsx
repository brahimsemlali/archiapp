"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  Settings,
  Menu,
  Receipt,
  BadgeDollarSign,
  Search,
  ListTodo,
  Clock,
  HardHat,
  TrendingUp,
  Boxes,
  UsersRound,
  Package,
  Palette,
  LayoutTemplate,
  UserPlus,
  Calculator,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SearchModal } from "./search-modal";
import { WorkspaceSwitcher, type WorkspaceSwitcherItem } from "./workspace-switcher";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", accent: "#2563EB" },
  { href: "/projects", icon: FolderOpen, labelKey: "projects", accent: "#2F8F5C" },
  { href: "/clients", icon: Users, labelKey: "clients", accent: "#6B3FA0" },
  { href: "/contracts", icon: FileText, labelKey: "contracts", accent: "#E8A317" },
  { href: "/devis", icon: Receipt, labelKey: "devis", accent: "#2563EB" },
  { href: "/factures", icon: BadgeDollarSign, labelKey: "factures", accent: "#2F8F5C" },
  { href: "/tasks", icon: ListTodo, labelKey: "tasks", accent: "#2563EB" },
  { href: "/time", icon: Clock, labelKey: "time", accent: "#E8A317" },
  { href: "/workload", icon: UsersRound, labelKey: "workload", accent: "#2F8F5C" },
  { href: "/rapports", icon: TrendingUp, labelKey: "rapports", accent: "#C75B2E" },
  { href: "/boq", icon: Boxes, labelKey: "boq", accent: "#6B3FA0" },
  { href: "/subcontractors", icon: HardHat, labelKey: "subcontractors", accent: "#C75B2E" },
  { href: "/fournisseurs", icon: Package, labelKey: "fournisseurs", accent: "#2F8F5C" },
  { href: "/moodboards", icon: Palette, labelKey: "moodboards", accent: "#6B3FA0" },
  { href: "/templates", icon: LayoutTemplate, labelKey: "templates", accent: "#2563EB" },
  { href: "/prospects", icon: UserPlus, labelKey: "prospects", accent: "#2F8F5C" },
  { href: "/bareme", icon: Calculator, labelKey: "bareme", accent: "#E8A317" },
  { href: "/settings", icon: Settings, labelKey: "settings", accent: "#6B3FA0" },
] as const;

const navSections = [
  { labelKey: "main", items: [navItems[0], navItems[1], navItems[2], navItems[3]] },
  { labelKey: "finance", items: [navItems[4], navItems[5], navItems[9]] },
  { label: "Planning", items: [navItems[6], navItems[7], navItems[8]] },
  { labelKey: "tools", items: [navItems[10], navItems[11], navItems[12]] },
  { label: "Commercial", items: [navItems[15], navItems[16]] },
  { label: "Creative", items: [navItems[13], navItems[14]] },
  { label: "Compte", items: [navItems[17]] },
] as const;

interface MobileNavProps {
  activeWorkspaceId?: string | null;
  workspaces?: WorkspaceSwitcherItem[];
}

export function MobileNav({ activeWorkspaceId, workspaces = [] }: MobileNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const ts = useTranslations("nav.sections");
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="md:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white/80 text-[#475569] shadow-[0_8px_20px_rgba(22,23,14,0.05)] transition-colors hover:bg-[#F1F5F9]">
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(88vw,20rem)] p-0 border-r border-[#E5E7EB] bg-white/95 backdrop-blur-xl">
          {/* Brand */}
          <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#F0EEE8]">
            <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#0B1220] via-[#2563EB] to-[#2F8F5C] shrink-0 shadow-[0_10px_24px_rgba(42,69,240,0.22)]">
              <span className="font-fraunces text-[#F7F8FA] text-[13px] font-semibold leading-none">A</span>
            </div>
            <span className="font-fraunces font-semibold text-[15px] tracking-tight text-[#0B1220]">ArchiDesk</span>
          </div>

          <div className="pt-3">
            <WorkspaceSwitcher activeWorkspaceId={activeWorkspaceId} workspaces={workspaces} />
          </div>

          {/* Search trigger */}
          <div className="px-2.5 pt-3">
            <button
              onClick={() => { setOpen(false); setSearchOpen(true); }}
              className="w-full min-h-11 flex items-center gap-2 px-3 rounded-xl text-[12.5px] text-[#64748B] bg-[#F7F8FA] border border-[#E5E7EB] hover:border-[#C5C3B8] transition-colors"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
              <span className="flex-1 text-left">Rechercher…</span>
              <kbd className="text-[9.5px] bg-white border border-[#E5E7EB] rounded px-1.5 py-[2px] font-mono">⌘K</kbd>
            </button>
          </div>

          {/* Nav */}
          <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            <div className="space-y-3">
              {navSections.map((section) => (
                <div key={"labelKey" in section ? section.labelKey : section.label}>
                  <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C5C3B8]">
                    {"labelKey" in section ? ts(section.labelKey) : section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map(({ href, icon: Icon, labelKey, accent }) => {
                      const isActive = pathname.startsWith(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "relative flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-200",
                            isActive
                              ? "bg-white text-[#0B1220] shadow-[0_8px_20px_rgba(22,23,14,0.07)] ring-1 ring-[#E5E7EB]"
                              : "text-[#475569] hover:bg-[#F7F8FA] hover:text-[#0B1220]"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-[3px]" style={{ backgroundColor: accent }} />
                          )}
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                              isActive ? "text-white" : "text-[#8F8D7E]"
                            )}
                            style={isActive ? { backgroundColor: accent } : undefined}
                          >
                            <Icon className="h-[14px] w-[14px]" />
                          </span>
                          <span className="truncate">{t(labelKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
