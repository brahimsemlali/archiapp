"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  Settings,
  Receipt,
  BadgeDollarSign,
  LogOut,
  ListTodo,
  Clock,
  HardHat,
  TrendingUp,
  Palette,
  UserPlus,
  Package,
  LayoutTemplate,
  Calculator,
  Boxes,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PushNotificationToggle } from "./push-notification-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { WorkspaceSwitcher, type WorkspaceSwitcherItem } from "./workspace-switcher";

const mainNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", accent: "#2563EB" },
  { href: "/projects", icon: FolderOpen, labelKey: "projects", accent: "#2F8F5C" },
  { href: "/clients", icon: Users, labelKey: "clients", accent: "#6B3FA0" },
  { href: "/contracts", icon: FileText, labelKey: "contracts", accent: "#E8A317" },
] as const;

const financeNavItems = [
  { href: "/devis", icon: Receipt, labelKey: "devis", accent: "#2563EB" },
  { href: "/factures", icon: BadgeDollarSign, labelKey: "factures", accent: "#2F8F5C" },
  { href: "/rapports", icon: TrendingUp, labelKey: "rapports", accent: "#C75B2E" },
] as const;

const planningNavItems = [
  { href: "/tasks", icon: ListTodo, labelKey: "tasks", accent: "#2563EB" },
  { href: "/time", icon: Clock, labelKey: "time", accent: "#E8A317" },
  { href: "/workload", icon: UsersRound, labelKey: "workload", accent: "#2F8F5C" },
] as const;

const opsNavItems = [
  { href: "/boq", icon: Boxes, labelKey: "boq", accent: "#6B3FA0" },
  { href: "/subcontractors", icon: HardHat, labelKey: "subcontractors", accent: "#C75B2E" },
  { href: "/fournisseurs", icon: Package, labelKey: "fournisseurs", accent: "#2F8F5C" },
] as const;

const creativeNavItems = [
  { href: "/moodboards", icon: Palette, labelKey: "moodboards", accent: "#6B3FA0" },
  { href: "/templates", icon: LayoutTemplate, labelKey: "templates", accent: "#2563EB" },
] as const;

const commercialNavItems = [
  { href: "/prospects", icon: UserPlus, labelKey: "prospects", accent: "#2F8F5C" },
  { href: "/bareme", icon: Calculator, labelKey: "bareme", accent: "#E8A317" },
] as const;

function NavItem({
  href,
  icon: Icon,
  label,
  pathname,
  accent = "#2563EB",
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  pathname: string;
  accent?: string;
}) {
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const navStyle = { "--nav-accent": accent } as CSSProperties;
  return (
    <Link
      href={href}
      style={navStyle}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-200",
        isActive
          ? "bg-white text-[#0B1220] shadow-[0_8px_22px_rgba(22,23,14,0.08)] ring-1 ring-[#E5E7EB]"
          : "text-[#475569] hover:-translate-y-px hover:bg-white/80 hover:text-[#0B1220] hover:shadow-[0_8px_20px_rgba(22,23,14,0.045)]"
      )}
    >
      {isActive && <span className="nav-active-dot" />}
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-200",
          isActive ? "text-white shadow-sm" : "text-[#8F8D7E] group-hover:text-[#0B1220]"
        )}
        style={isActive ? { backgroundColor: accent } : undefined}
      >
        <Icon className="h-[14px] w-[14px]" />
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}

interface SidebarProps {
  userEmail?: string;
  workspaceName?: string;
  activeWorkspaceId?: string | null;
  workspaces?: WorkspaceSwitcherItem[];
  locale?: string;
}

export function Sidebar({ userEmail, workspaceName, activeWorkspaceId, workspaces = [], locale = "fr" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("nav");
  const ts = useTranslations("nav.sections");
  const ta = useTranslations("auth");

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "U";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navSections = [
    { label: ts("main"), items: mainNavItems },
    { label: ts("finance"), items: financeNavItems },
    { label: "Planning", items: planningNavItems },
    { label: ts("tools"), items: opsNavItems },
    { label: "Commercial", items: commercialNavItems },
    { label: "Creative", items: creativeNavItems },
  ];

  return (
    <aside className="hidden md:flex w-[232px] shrink-0 border-r border-[#E5E7EB]/90 bg-white/88 backdrop-blur-xl flex-col h-screen sticky top-0 shadow-[10px_0_34px_rgba(22,23,14,0.045)]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-[#F0EEE8]/80">
        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#0B1220] via-[#2563EB] to-[#2F8F5C] shrink-0 shadow-[0_10px_24px_rgba(42,69,240,0.24)]">
          <span className="font-fraunces text-[#F7F8FA] text-[14px] font-semibold leading-none">A</span>
        </div>
        <div className="min-w-0">
          <p className="font-fraunces font-semibold text-[15px] tracking-tight text-[#0B1220] truncate leading-none">
            ArchiDesk
          </p>
          <p className="text-[10px] text-[#64748B] leading-none mt-[3px] tracking-[0.08em] font-medium truncate">
            {workspaceName ?? "Cabinet"}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <WorkspaceSwitcher activeWorkspaceId={activeWorkspaceId} workspaces={workspaces} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
        {navSections.map(({ label, items }) => (
          <div key={label}>
            <p className="px-2.5 mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C5C3B8]">
              {label}
            </p>
            <div className="space-y-1">
              {items.map(({ href, icon, labelKey, accent }) => (
                <NavItem key={href} href={href} icon={icon} label={t(labelKey)} pathname={pathname} accent={accent} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-[#F0EEE8]" />

      {/* User + bottom actions */}
      <div className="px-2.5 py-2.5 shrink-0">
        {/* User card */}
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg">
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white shadow-[0_8px_20px_rgba(22,23,14,0.1)]">
            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-[#E7F0FF] via-[#E5F3EB] to-[#FFF3D7] text-[#0B1220]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-[#0B1220] truncate leading-none">
              {userEmail?.split("@")[0] ?? "Utilisateur"}
            </p>
            <p className="text-[10px] text-[#ADAB9D] truncate mt-[3px]">{userEmail ?? ""}</p>
          </div>
        </div>
        <div className="flex flex-col gap-px">
          <PushNotificationToggle />
          <NavItem href="/settings" icon={Settings} label={t("settings")} pathname={pathname} accent="#6B3FA0" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium text-[#ADAB9D] hover:bg-red-50 hover:text-red-500 transition-colors duration-100 w-full"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            <span className="leading-none">{ta("logout")}</span>
          </button>
        </div>
        <div className="mt-2 pt-2 border-t border-[#F0EEE8]">
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>
    </aside>
  );
}
