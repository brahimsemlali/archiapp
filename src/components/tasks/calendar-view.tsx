"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "@/components/tasks/task-form";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  FolderOpen,
  Receipt,
  BadgeDollarSign,
  HardHat,
  CalendarDays,
  X,
  Plus,
} from "lucide-react";

export interface CalendarEvent {
  id: string;
  date: string;
  label: string;
  type: "task" | "project_deadline" | "devis_expiry" | "facture_due" | "visite";
  priority?: string;
  status?: string;
  href?: string;
}

interface Project { id: string; title: string }
interface Client { id: string; name: string }
interface Member { userId: string; role: string }

interface CalendarViewProps {
  events: CalendarEvent[];
  projects?: Project[];
  clients?: Client[];
  members?: Member[];
  currentUserId?: string;
}

const EVENT_CONFIG: Record<
  CalendarEvent["type"],
  { dot: string; bar: string; bg: string; text: string; icon: React.ElementType; label: string }
> = {
  task:             { dot: "bg-blue-500",    bar: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700",    icon: CheckCircle2,    label: "Tâche" },
  project_deadline: { dot: "bg-red-500",     bar: "bg-red-500",     bg: "bg-red-50",     text: "text-red-700",     icon: FolderOpen,      label: "Deadline projet" },
  devis_expiry:     { dot: "bg-amber-400",   bar: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700",   icon: Receipt,         label: "Expiration devis" },
  facture_due:      { dot: "bg-emerald-500", bar: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", icon: BadgeDollarSign, label: "Échéance facture" },
  visite:           { dot: "bg-violet-500",  bar: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700",  icon: HardHat,         label: "Visite chantier" },
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

function fmtLong(ymd: string) {
  return new Date(ymd + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function fmtShort(ymd: string) {
  return new Date(ymd + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function CalendarView({ events, projects = [], clients = [], members = [], currentUserId }: CalendarViewProps) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(today));
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupDate(null);
      }
    }
    if (popupDate) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popupDate]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(toYMD(today));
    setPopupDate(null);
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const n = i - startDow + 1;
    cells.push(n < 1 || n > daysInMonth ? null : new Date(year, month, n));
  }

  const byDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date]!.push(ev);
  }

  const selectedEvents = byDate[selectedDate] ?? [];
  const popupEvents = popupDate ? (byDate[popupDate] ?? []) : [];
  const todayStr = toYMD(today);

  const monthCounts: Partial<Record<CalendarEvent["type"], number>> = {};
  for (const ev of events) {
    const d = new Date(ev.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      monthCounts[ev.type] = (monthCounts[ev.type] ?? 0) + 1;
    }
  }

  function handleDayClick(ymd: string) {
    setSelectedDate(ymd);
    setPopupDate(ymd);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* ── Calendar grid ── */}
      <div className="flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-2xl p-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {}}
              className="flex items-center gap-1 font-fraunces text-[22px] font-medium text-[#0B1220] tracking-tight hover:text-[#2563EB] transition-colors"
            >
              {MONTHS_FR[month]}
              <ChevronDown className="h-4 w-4 text-[#64748B] mt-0.5" />
            </button>
            <button
              onClick={() => {}}
              className="flex items-center gap-1 font-fraunces text-[22px] font-medium text-[#64748B] hover:text-[#0B1220] transition-colors"
            >
              {year}
              <ChevronDown className="h-4 w-4 text-[#ADAB9D] mt-0.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-medium rounded-full bg-[#0B1220] hover:bg-[#2D2E22] text-[#F7F8FA] border-0 gap-1.5"
              onClick={() => setQuickAddDate(selectedDate)}
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle tâche
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium rounded-full border-[#E5E7EB] text-[#1E293B] hover:bg-[#F1F5F9]" onClick={goToday}>
              Aujourd&apos;hui
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[#E5E7EB] hover:bg-[#F1F5F9]" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[#E5E7EB] hover:bg-[#F1F5F9]" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_FR.map((d) => (
            <div key={d} className="text-left text-[11px] font-semibold text-[#64748B] pb-2.5 px-2 uppercase tracking-[0.08em]">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 border-l border-t border-[#E5E7EB]">
          {cells.map((date, i) => {
            if (!date) {
              return (
                <div
                  key={`empty-${i}`}
                  className="border-r border-b border-[#E5E7EB] min-h-[110px] bg-[#F7F8FA]/60 opacity-40"
                />
              );
            }
            const ymd = toYMD(date);
            const dayEvents = byDate[ymd] ?? [];
            const isToday = ymd === todayStr;
            const isSelected = ymd === selectedDate;

            return (
              <button
                key={ymd}
                onClick={() => handleDayClick(ymd)}
                className={cn(
                  "border-r border-b border-[#E5E7EB] min-h-[110px] p-2 flex flex-col items-start text-left transition-colors duration-150",
                  isToday ? "bg-[#E9ECFF]" :
                  isSelected ? "bg-[#F1F5F9]" :
                  "hover:bg-[#FBFBF8]"
                )}
              >
                {/* Day number */}
                <span className={cn(
                  "text-[12.5px] font-bold h-7 w-7 flex items-center justify-center rounded-full mb-1.5 shrink-0 tabnum",
                  isToday
                    ? "text-[#1B2DC4] font-[700]"
                    : isSelected
                    ? "text-[#0B1220]"
                    : "text-[#0B1220]"
                )}>
                  {date.getDate()}
                </span>

                {/* Event bars */}
                <div className="flex flex-col gap-[3px] w-full overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const cfg = EVENT_CONFIG[ev.type];
                    return (
                      <div key={ev.id} className="flex items-center gap-1 w-full overflow-hidden">
                        <span className={cn("w-[3px] h-3 rounded-full shrink-0", cfg.bar)} />
                        <span className="text-[10px] text-[#64748B] truncate leading-tight hidden sm:block font-medium">
                          {ev.label}
                        </span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-[#ADAB9D] pl-3">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-[#E5E7EB]">
          {(Object.entries(EVENT_CONFIG) as [CalendarEvent["type"], typeof EVENT_CONFIG[CalendarEvent["type"]]][]).map(
            ([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                {cfg.label}
              </div>
            )
          )}
        </div>

        {/* ── Day popup overlay ── */}
        {popupDate && (
          <div
            ref={popupRef}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl"
            style={{ boxShadow: "0 16px 40px rgba(20,20,10,0.08), 0 2px 6px rgba(20,20,10,0.04)" }}
          >
            {/* Popup header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
              <div>
                <p className="font-fraunces text-[17px] font-medium text-[#0B1220] capitalize leading-tight">
                  {fmtLong(popupDate)}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {popupEvents.length === 0 ? "Aucun événement" : `${popupEvents.length} événement${popupEvents.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <button
                onClick={() => setPopupDate(null)}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1220] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Popup events */}
            {popupEvents.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[#64748B]">Rien de planifié ce jour.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9] max-h-64 overflow-y-auto">
                {popupEvents.map((ev) => {
                  const cfg = EVENT_CONFIG[ev.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", cfg.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[10px] font-semibold uppercase tracking-wide", cfg.text)}>
                          {cfg.label}
                        </p>
                        <p className="text-[13px] font-medium text-[#0B1220] leading-snug mt-0.5 line-clamp-2">
                          {ev.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Popup footer */}
            <div className="px-4 py-3 border-t border-[#E5E7EB]">
              <button
                onClick={() => { setPopupDate(null); setQuickAddDate(popupDate); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#0B1220] hover:bg-[#F7F8FA] rounded-lg py-2 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une tâche ce jour
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-72 shrink-0 space-y-4">
        {/* Scheduled panel */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-4 border-b border-[#E5E7EB]">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-fraunces text-[18px] font-medium text-[#0B1220]">Planifié</p>
                <p className="text-xs text-[#64748B] mt-0.5 capitalize">{fmtShort(selectedDate)}</p>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  onClick={() => setQuickAddDate(selectedDate)}
                  className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1220] transition-colors"
                  title="Ajouter une tâche"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <CalendarDays className="h-3.5 w-3.5 text-[#64748B] mr-1" />
                <button
                  onClick={() => {
                    const prev = addDays(selectedDate, -1);
                    setSelectedDate(prev);
                    const d = new Date(prev + "T00:00:00");
                    setYear(d.getFullYear());
                    setMonth(d.getMonth());
                  }}
                  className="p-1 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1220] transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    const next = addDays(selectedDate, 1);
                    setSelectedDate(next);
                    const d = new Date(next + "T00:00:00");
                    setYear(d.getFullYear());
                    setMonth(d.getMonth());
                  }}
                  className="p-1 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1220] transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Events list */}
          {selectedEvents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CalendarDays className="h-8 w-8 text-[#E5E7EB] mx-auto mb-2" />
              <p className="text-sm text-[#64748B]">Rien ce jour-là</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {selectedEvents.map((ev) => {
                const cfg = EVENT_CONFIG[ev.type];
                const Icon = cfg.icon;
                return (
                  <div key={ev.id} className="px-4 py-3.5">
                    {/* Thick top colored bar */}
                    <div className={cn("h-[3px] rounded-full w-full mb-3", cfg.bar)} />
                    <div className="flex items-start gap-2.5">
                      <div className={cn("p-1.5 rounded-lg shrink-0", cfg.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-[#0B1220] leading-snug line-clamp-2">
                          {ev.label}
                        </p>
                        <p className={cn("text-[11px] font-medium mt-0.5 uppercase tracking-wide", cfg.text)}>
                          {cfg.label}
                        </p>
                        {ev.type === "task" && ev.priority && (
                          <p className="text-xs text-[#64748B] mt-1">Priorité {ev.priority}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Month summary */}
        {Object.keys(monthCounts).length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
            <p className="eyebrow mb-3">Ce mois</p>
            <div className="space-y-2.5">
              {(Object.entries(monthCounts) as [CalendarEvent["type"], number][]).map(([type, count]) => {
                const cfg = EVENT_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
                      <span className="text-xs text-[#1E293B]">{cfg.label}</span>
                    </div>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick-add task dialog */}
      <Dialog open={quickAddDate !== null} onOpenChange={(open) => { if (!open) setQuickAddDate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-[20px] font-medium text-[#0B1220]">
              Nouvelle tâche
              {quickAddDate && (
                <span className="text-[#64748B] font-normal text-base ml-2">— {fmtLong(quickAddDate)}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            projects={projects}
            clients={clients}
            members={members}
            currentUserId={currentUserId}
            defaultDueDate={quickAddDate ?? undefined}
            onSuccess={() => { setQuickAddDate(null); router.refresh(); }}
            onCancel={() => setQuickAddDate(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
