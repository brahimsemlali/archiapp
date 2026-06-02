"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderOpen, Users, FileText, Receipt, BadgeDollarSign, X } from "lucide-react";
import { globalSearchAction } from "@/lib/actions/search";

interface SearchResult {
  id: string;
  label: string;
  sub?: string;
  href: string;
  type: "project" | "client" | "contract" | "devis" | "facture";
}

const TYPE_CONFIG = {
  project:  { icon: FolderOpen,      color: "text-blue-500",   label: "Projet" },
  client:   { icon: Users,           color: "text-green-500",  label: "Client" },
  contract: { icon: FileText,        color: "text-violet-500", label: "Contrat" },
  devis:    { icon: Receipt,         color: "text-orange-500", label: "Devis" },
  facture:  { icon: BadgeDollarSign, color: "text-rose-500",   label: "Facture" },
} as const;

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setQuery("");
      setResults([]);
      setSelected(0);
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const seq = ++searchSeq.current;

    try {
      const res = await globalSearchAction(q);
      if (seq !== searchSeq.current) return;
      setResults(res);
      setSelected(0);
    } finally {
      if (seq === searchSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected]!.href);
    if (e.key === "Escape") onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un projet, client, contrat…"
            className="flex-1 text-sm outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Recherche…</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucun résultat pour « {query} »</div>
          )}
          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((r, idx) => {
                const cfg = TYPE_CONFIG[r.type];
                const Icon = cfg.icon;
                return (
                  <li key={r.id}>
                    <button
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === selected ? "bg-accent" : "hover:bg-accent/50"}`}
                      onClick={() => navigate(r.href)}
                      onMouseEnter={() => setSelected(idx)}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{cfg.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!query && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Tapez pour rechercher · <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">↑↓</kbd> naviguer · <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">↵</kbd> ouvrir
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
