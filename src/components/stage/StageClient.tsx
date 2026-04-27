"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Mic, Calendar, MapPin, Music2, Plus, X, Trash2, Loader2,
  Clock, GripVertical, ChevronRight, Volume2, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track } from "@/types";

interface Setlist {
  id: string;
  event_name: string;
  event_date: string;
  venue: string | null;
  bpm_notes: string | null;
  technical_rider_url: string | null;
  track_ids: string[];
  project_id: string;
  created_at: string;
}

interface Props {
  projectId: string;
  initialSetlists: Setlist[];
  tracks: Track[];
  currentUserId: string;
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StageClient({ projectId, initialSetlists, tracks }: Props) {
  const supabase = createClient();
  const [setlists, setSetlists] = useState<Setlist[]>(initialSetlists);
  const [selectedId, setSelectedId] = useState<string | null>(initialSetlists[0]?.id ?? null);
  const [showCreate, setShowCreate] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Form state
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = setlists.find(s => s.id === selectedId) ?? null;
  const trackMap = new Map(tracks.map(t => [t.id, t]));
  const selectedTracks = selected ? selected.track_ids.map(id => trackMap.get(id)).filter(Boolean) as Track[] : [];
  const totalDuration = selectedTracks.reduce((acc, t) => acc + (t.duration_seconds || 0), 0);
  const availableTracks = tracks.filter(t => !selected?.track_ids.includes(t.id));

  const resetForm = () => { setEventName(""); setEventDate(""); setVenue(""); setError(null); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !eventDate || saving) return;
    setSaving(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("stage_setlists")
      .insert({
        project_id: projectId,
        event_name: eventName.trim(),
        event_date: eventDate,
        venue: venue.trim() || null,
        track_ids: [],
      })
      .select("*")
      .single();

    if (err) { setError(err.message); setSaving(false); return; }

    setSetlists(prev => [data as Setlist, ...prev]);
    setSelectedId((data as Setlist).id);
    setShowCreate(false);
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("stage_setlists").delete().eq("id", id);
    setSetlists(prev => prev.filter(s => s.id !== id));
    if (selectedId === id) setSelectedId(setlists.find(s => s.id !== id)?.id ?? null);
  };

  const updateTrackIds = async (newIds: string[]) => {
    if (!selected) return;
    setSetlists(prev => prev.map(s => s.id === selected.id ? { ...s, track_ids: newIds } : s));
    await supabase.from("stage_setlists").update({ track_ids: newIds }).eq("id", selected.id);
  };

  const updateField = async (field: "venue" | "bpm_notes" | "event_name", value: string) => {
    if (!selected) return;
    setSetlists(prev => prev.map(s => s.id === selected.id ? { ...s, [field]: value } : s));
    await supabase.from("stage_setlists").update({ [field]: value || null }).eq("id", selected.id);
  };

  const addTrack = (trackId: string) => updateTrackIds([...(selected?.track_ids ?? []), trackId]);
  const removeTrack = (trackId: string) => updateTrackIds((selected?.track_ids ?? []).filter(id => id !== trackId));

  const onDragStart = (index: number) => setDraggedIndex(index);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (targetIndex: number) => {
    if (draggedIndex === null || !selected) return;
    const newIds = [...selected.track_ids];
    const [moved] = newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, moved);
    updateTrackIds(newIds);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stage Prep</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {setlists.length} show{setlists.length !== 1 ? "s" : ""} préparé{setlists.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus className="h-4 w-4" />
          Nouveau show
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Setlist list */}
        <aside className="lg:col-span-4 space-y-2">
          {setlists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Mic className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Aucun show</p>
              <p className="text-xs text-muted-foreground mt-1">Crée ton premier setlist live.</p>
            </div>
          ) : (
            setlists.map(s => {
              const isPast = s.event_date < new Date().toISOString().split("T")[0];
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all group",
                    selectedId === s.id
                      ? "bg-primary/10 border-primary/30 shadow-sm"
                      : "bg-card border-border hover:bg-accent/30",
                    isPast && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{s.event_name}</p>
                      <div className="mt-1.5 space-y-1">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(s.event_date)}
                        </p>
                        {s.venue && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {s.venue}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Music2 className="h-3 w-3" />
                          {s.track_ids.length} track{s.track_ids.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 flex-shrink-0 transition-transform",
                      selectedId === s.id ? "text-primary translate-x-0.5" : "text-muted-foreground/40"
                    )} />
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Right: Setlist detail */}
        <main className="lg:col-span-8">
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Mic className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Sélectionne un show</p>
              <p className="text-xs text-muted-foreground mt-1">Ou crée-en un nouveau pour commencer.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Setlist header */}
              <div className="border-b border-border p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="text"
                    value={selected.event_name}
                    onChange={(e) => updateField("event_name", e.target.value)}
                    onBlur={(e) => updateField("event_name", e.target.value)}
                    className="text-xl font-bold text-foreground bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -ml-1 flex-1"
                  />
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(selected.event_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Total : {formatDuration(totalDuration)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Lieu
                    </label>
                    <input
                      type="text"
                      defaultValue={selected.venue ?? ""}
                      onBlur={(e) => updateField("venue", e.target.value)}
                      placeholder="Salle, ville…"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Volume2 className="h-3 w-3" /> Notes BPM / Tech
                    </label>
                    <input
                      type="text"
                      defaultValue={selected.bpm_notes ?? ""}
                      onBlur={(e) => updateField("bpm_notes", e.target.value)}
                      placeholder="Click track, transitions…"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              {/* Tracklist */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Music2 className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Setlist</h3>
                </div>

                {selectedTracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-xl">
                    Aucun track. Ajoute-en depuis la liste ci-dessous.
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {selectedTracks.map((t, i) => (
                      <li
                        key={t.id}
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(i)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3 cursor-move transition-all",
                          draggedIndex === i && "opacity-40 scale-[0.98]"
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                        <span className="text-xs font-bold text-muted-foreground tabular-nums w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t.bpm ? `${t.bpm} BPM` : "—"} · {formatDuration(t.duration_seconds)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeTrack(t.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                {/* Add tracks */}
                {availableTracks.length > 0 && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ajouter au setlist</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTracks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => addTrack(t.id)}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          {t.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tracks.length === 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">
                      Uploade des tracks dans The Vault pour les ajouter ici.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); resetForm(); } }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Nouveau show</h2>
              </div>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Nom de l&apos;événement <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Olympia, Festival X, Release Party…"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Lieu <span className="text-muted-foreground font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Paris, Bercy…"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving || !eventName.trim() || !eventDate}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Créer le show
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
