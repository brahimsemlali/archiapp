"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  Settings,
  Building2,
  Receipt,
  BadgeDollarSign,
} from "lucide-react";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/projects", icon: FolderOpen, labelKey: "projects" },
  { href: "/clients", icon: Users, labelKey: "clients" },
  { href: "/contracts", icon: FileText, labelKey: "contracts" },
  { href: "/devis", icon: Receipt, labelKey: "devis" },
  { href: "/factures", icon: BadgeDollarSign, labelKey: "factures" },
  { href: "/settings", icon: Settings, labelKey: "settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r bg-white flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center gap-2 px-4 border-b">
        <Building2 className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg tracking-tight">ArchiDesk</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, icon: Icon, labelKey }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
