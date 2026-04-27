"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, List, Plus, X, Loader2, Trash2, Music2, Mic, AlertCircle, Star } from "lucide-react";
import CalendarView from "./CalendarView";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";

type EventType = "session" | "deadline" | "release" | "promo";

const EVENT_TYPES = [
  { value: "session"  as EventType, label: "Session studio", icon: Music2,      color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", hover: "hover:border-violet-500/40 hover:bg-violet-500/15" },
  { value: "deadline" as EventType, label: "Deadline",        icon: AlertCircle, color: "text-rose-400",   bg: "bg-rose-500/10 border-rose-500/20",     hover: "hover:border-rose-500/40 hover:bg-rose-500/15" },
  { value: "release"  as EventType, label: "Release",         icon: Star,        color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   hover: "hover:border-amber-500/40 hover:bg-amber-500/15" },
  { value: "promo"    as EventType, label: "Promo / Show",    icon: Mic,         color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",     hover: "hover:border-cyan-500/40 hover:bg-cyan-500/15" },
] as const;

function typeConfig(type: EventType) {
  return EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[0];
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    dayName: d.toLocaleDateString("fr-FR", { weekday: "short" }),
    dayNum: d.getDate().toString(),
    month: d.toLocaleDateString("fr-FR", { month: "short" }),
  };
}

function groupByMonth(events: TimelineEvent[]): { month: string; events: TimelineEvent[] }[] {
  const map = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const key = new Date(ev.date + "T00:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries()).map(([month, evs]) => ({ month, events: evs }));
}

interface Props {
  projectId: string;
  initialEvents: TimelineEvent[];
  currentUserId: string;
}

export default function TimelineClient({ projectId, initialEvents, currentUserId }: Props) {
  const supabase = createClient();
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("session");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => { setTitle(""); setEventType("session"); setDate(""); setDescription(""); setFormError(null); };
  const openModal = () => { resetForm(); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || saving) return;
    setSaving(true);
    setFormError(null);

    const { data, error } = await supabase
      .from("timeline_events")
      .insert({ project_id: projectId, title: title.trim(), event_type: eventType, date, description: description.trim() || null, created_by: currentUserId })
      .select("*")
      .single();

    if (error) { setFormError(error.message); setSaving(false); return; }
    setEvents((prev) => [...prev, data as TimelineEvent].sort((a, b) => a.date.localeCompare(b.date)));
    closeModal();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("timeline_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const handleDeleteFromCalendar = (id: string) => {
    handleDelete(id);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingEvents = events.filter((e) => e.date >= todayStr);
  const pastEvents = events.filter((e) => e.date < todayStr).reverse();
  const groupedUpcoming = useMemo(() => groupByMonth(upcomingEvents), [upcomingEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Timeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {events.length} événement{events.length !== 1 ? "s" : ""}
            {upcomingEvents.length > 0 && ` · ${upcomingEvents.length} à venir`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-secondary p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Liste
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                view === "calendar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendrier
            </button>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            Nouvel événement
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <CalendarView
          events={events}
          onDelete={handleDeleteFromCalendar}
          deletingId={deletingId}
          onNewEvent={openModal}
        />
      )}

      {/* Empty state */}
      {view === "list" && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 gap-3">
          <Calendar className="h-8 w-8 text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Aucun événement</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions studio, deadlines, releases, shows…</p>
          </div>
          <button
            onClick={openModal}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Premier événement
          </button>
        </div>
      )}

      {/* List view: Table style */}
      {view === "list" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-5 py-3 font-semibold text-muted-foreground w-40">Date</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Événement</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground w-32">Type</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground">Notes</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground italic">
                    Aucun événement programmé
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const cfg = typeConfig(ev.event_type as EventType);
                  const isPast = ev.date < todayStr;
                  return (
                    <tr
                      key={ev.id}
                      className={cn(
                        "group hover:bg-accent/30 transition-colors",
                        isPast && "opacity-50"
                      )}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground capitalize">
                            {new Date(ev.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-foreground">
                        {ev.title}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium", cfg.bg, cfg.color)}>
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground line-clamp-1">
                        {ev.description || "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(ev.id)}
                          disabled={deletingId === ev.id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          {deletingId === ev.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal section remains the same */}

      {/* Create modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Nouvel événement</h2>
              </div>
              <button onClick={closeModal} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setEventType(t.value)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all text-left",
                        eventType === t.value
                          ? `${t.bg} ${t.color}`
                          : "border-border bg-secondary text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <t.icon className="h-4 w-4 flex-shrink-0" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Titre <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Session mix, Deadline master, Sortie single…"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition [color-scheme:dark]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Notes <span className="text-muted-foreground font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails, lieu, notes…"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>

              {formError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>
              )}

              <button
                type="submit"
                disabled={saving || !title.trim() || !date}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Ajouter l&apos;événement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
