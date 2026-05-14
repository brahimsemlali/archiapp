"use client";

import { useState, useEffect } from "react";
import { Command, Search, Sparkles } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { SearchModal } from "./search-modal";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { WorkspaceSwitcherItem } from "./workspace-switcher";

interface HeaderProps {
  activeWorkspaceId?: string | null;
  workspaces?: WorkspaceSwitcherItem[];
}

export function Header({ activeWorkspaceId, workspaces = [] }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="h-14 border-b border-[#EDEBE4]/90 bg-white/82 backdrop-blur-xl flex items-center gap-3 px-4 md:px-5 sticky top-0 z-40 shadow-[0_10px_28px_rgba(22,23,14,0.045)]">
        <MobileNav activeWorkspaceId={activeWorkspaceId} workspaces={workspaces} />

        <button
          onClick={() => setSearchOpen(true)}
          className="group flex min-h-10 flex-1 items-center gap-2 rounded-xl border border-[#E8E6DF] bg-[#F7F7F4]/90 px-3 text-left text-[12.5px] text-[#82806F] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-200 hover:-translate-y-px hover:border-[#C5C3B8] hover:bg-white hover:shadow-[0_10px_28px_rgba(22,23,14,0.07)] md:max-w-sm"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[#2A45F0] transition-colors group-hover:text-[#1731D3]" />
          <span className="flex-1 truncate">Rechercher…</span>
          <kbd className="hidden items-center gap-1 rounded-md border border-[#E8E6DF] bg-white px-1.5 py-[3px] font-mono text-[9.5px] leading-none text-[#ADAB9D] shadow-sm sm:inline-flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <div className="hidden items-center gap-2 rounded-full border border-[#E8E6DF] bg-white/75 px-3 py-2 text-[11px] font-bold text-[#6B6B5A] shadow-[0_8px_22px_rgba(22,23,14,0.045)] lg:flex">
          <Sparkles className="h-3.5 w-3.5 text-[#E8A317]" />
          Studio OS
        </div>

        <NotificationBell />
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
