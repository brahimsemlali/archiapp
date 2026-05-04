"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  Settings,
  Building2,
  Menu,
} from "lucide-react";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/projects", icon: FolderOpen, labelKey: "projects" },
  { href: "/clients", icon: Users, labelKey: "clients" },
  { href: "/contracts", icon: FileText, labelKey: "contracts" },
  { href: "/settings", icon: Settings, labelKey: "settings" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <div className="h-16 flex items-center gap-2 px-4 border-b">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg tracking-tight">ArchiDesk</span>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(({ href, icon: Icon, labelKey }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
