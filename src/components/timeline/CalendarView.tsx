"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Music2, Mic, AlertCircle, Star, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";

type EventType = "session" | "deadline" | "release" | "promo";

const EVENT_CONFIG: Record<EventType, { label: string; border: string; text: string; bg: string; icon: React.ElementType }> = {
  session:  { label: "Session",  border: "border-l-violet-500",  text: "text-violet-500 dark:text-violet-400",  bg: "bg-violet-500/10 hover:bg-violet-500/20", icon: Music2 },
  deadline: { label: "Deadline",  border: "border-l-rose-500",    text: "text-rose-500 dark:text-rose-400",    bg: "bg-rose-500/10 hover:bg-rose-500/20",   icon: AlertCircle },
  release:  { label: "Release",   border: "border-l-amber-500",   text: "text-amber-500 dark:text-amber-400",   bg: "bg-amber-500/10 hover:bg-amber-500/20",  icon: Star },
  promo:    { label: "Promo",     border: "border-l-cyan-500",    text: "text-cyan-500 dark:text-cyan-400",    bg: "bg-cyan-500/10 hover:bg-cyan-500/20",   icon: Mic },
};

const DAY_LABELS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function buildGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startDow);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  events: TimelineEvent[];
  onDelete: (id: string) => void;
  deletingId: string | null;
  onNewEvent?: () => void;
}

export default function CalendarView({ events, onDelete, deletingId, onNewEvent }: Props) {
  const now = new Date();
  const todayKey = dateKey(now);

  const [current, setCurrent] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [popover, setPopover] = useState<string | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const cells = buildGrid(year, month);

  const eventMap = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const list = eventMap.get(ev.date) ?? [];
    list.push(ev);
    eventMap.set(ev.date, list);
  }

  const monthLabel = current.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden" onClick={() => setPopover(null)}>
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-6 py-5 bg-card">
        <h2 className="text-3xl font-bold tracking-tight text-foreground capitalize">
          {monthLabel}
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-secondary/50 rounded-lg p-1 border border-border">
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(new Date(year, month - 1, 1)); }}
              className="p-1.5 hover:bg-card rounded-md transition-all text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(new Date(now.getFullYear(), now.getMonth(), 1)); }}
              className="px-3 py-1 text-xs font-semibold hover:bg-card rounded-md transition-all text-foreground"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(new Date(year, month + 1, 1)); }}
              className="p-1.5 hover:bg-card rounded-md transition-all text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          {onNewEvent && (
            <button
              onClick={(e) => { e.stopPropagation(); onNewEvent(); }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
            >
              Ajouter
            </button>
          )}
        </div>
      </div>

      {/* ── Structure Tableau Unique ── */}
      <div className="grid grid-cols-7 border-t border-border">
        {/* Headers de colonnes */}
        {DAY_LABELS.map((label, i) => (
          <div key={label} className={cn(
            "py-2 pr-4 text-right text-[11px] font-bold uppercase tracking-widest border-b border-border bg-secondary/20",
            i < 6 && "border-r border-border",
            i >= 5 ? "text-muted-foreground/40" : "text-muted-foreground/60"
          )}>
            {label}
          </div>
        ))}

        {/* Cellules du Calendrier */}
        {cells.map((date, i) => {
          const col = i % 7;
          const isLastCol = col === 6;
          const isLastRow = i >= cells.length - 7;
          const isCurrentMonth = date.getMonth() === month;
          const key = dateKey(date);
          const isToday = key === todayKey;
          const dayEvents = isCurrentMonth ? (eventMap.get(key) ?? []) : [];
          const isWeekend = col === 5 || col === 6;

          return (
            <div
              key={key + i}
              className={cn(
                "min-h-[150px] flex flex-col group relative transition-colors",
                !isLastCol && "border-r border-border",
                !isLastRow && "border-b border-border",
                !isCurrentMonth ? "bg-secondary/5" : "bg-card hover:bg-accent/10",
                isWeekend && isCurrentMonth && "bg-secondary/10"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Numéro du jour */}
              <div className="flex justify-end p-2">
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all",
                  isToday ? "bg-primary text-primary-foreground shadow-sm" : 
                  isCurrentMonth ? "text-foreground group-hover:bg-secondary" : "text-muted-foreground/20"
                )}>
                  {date.getDate()}
                </span>
              </div>

              {/* Événements style macOS */}
              <div className="flex flex-col gap-1 px-1.5 pb-2 overflow-y-auto scrollbar-hide">
                {dayEvents.map((ev) => {
                  const cfg = EVENT_CONFIG[ev.event_type as EventType] ?? EVENT_CONFIG.session;
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPopover(popover === ev.id ? null : ev.id); }}
                        className={cn(
                          "w-full flex items-center gap-2 border-l-[3px] px-2 py-1.5 rounded-r-md text-[11px] font-bold text-left transition-all",
                          cfg.border, cfg.text, cfg.bg
                        )}
                      >
                        <Icon className="h-3 w-3 flex-shrink-0 opacity-70" />
                        <span className="truncate">{ev.title}</span>
                      </button>

                      {/* Popover Detail */}
                      {popover === ev.id && (
                        <div
                          className={cn(
                            "absolute z-50 w-64 rounded-2xl border border-border bg-card shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in duration-200",
                            col >= 4 ? "right-0" : "left-0",
                            "top-full mt-2"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-foreground leading-tight">{ev.title}</h4>
                              <p className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", cfg.text)}>
                                <Icon className="h-3 w-3" />
                                {cfg.label}
                              </p>
                            </div>
                            <button onClick={() => setPopover(null)} className="p-1 hover:bg-secondary rounded-full text-muted-foreground transition-all">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          {ev.description && (
                            <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
                              {ev.description}
                            </p>
                          )}
                          
                          <div className="pt-2">
                            <button
                              onClick={() => { onDelete(ev.id); setPopover(null); }}
                              disabled={deletingId === ev.id}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20 hover:bg-destructive/20 transition-all"
                            >
                              {deletingId === ev.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Supprimer"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
