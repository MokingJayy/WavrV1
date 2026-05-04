"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Music2, Mic, AlertCircle, Star, Plus, Trash2, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

interface StageSetlist {
  id: string;
  event_name: string;
  event_date: string;
  venue: string | null;
  project_id: string;
  created_at: string;
}

function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

function formatDate(iso: string): { day: string; date: string } {
  const date = new Date(iso + "T00:00:00");
  return {
    day: date.toLocaleDateString("fr-FR", { weekday: "short" }),
    date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
  };
}

export default function TimelinePage() {
  const supabase = createClient();
  const pathname = usePathname();
  const projectId = extractProjectId(pathname);

  const [setlists, setSetlists] = useState<StageSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSetlists = useCallback(async () => {
    const { data, error } = await supabase
      .from("stage_setlists")
      .select("id, event_name, event_date, venue");
    console.log("[Timeline] Fetched setlists:", { data, error, count: data?.length });
    setSetlists((data as StageSetlist[]) ?? []);
    setLoading(false);
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    setDeletingId(id);
    await supabase.from("stage_setlists").delete().eq("id", id);
    setSetlists(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
  };

  useEffect(() => { fetchSetlists(); }, [fetchSetlists]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Timeline</h2>
          <p className="text-base text-muted-foreground mt-0.5">Calendrier de sorties & sessions studio</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition">
          <Calendar className="h-5 w-5" />
          Nouvel événement
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-base font-semibold text-foreground">Calendrier</span>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="h-40 rounded-lg bg-secondary border border-border flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : setlists.length === 0 ? (
            <div className="h-40 rounded-lg bg-secondary border border-border flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Aucun événement</p>
            </div>
          ) : (
            setlists.map((setlist) => {
              const { day, date } = formatDate(setlist.event_date);
              return (
                <div
                  key={setlist.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition"
                >
                  <div className="text-center w-12 flex-shrink-0">
                    <p className="text-xs text-muted-foreground uppercase">{day}</p>
                    <p className="text-base font-bold text-cyan-400">{date}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                    <Mic className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{setlist.event_name}</p>
                    {setlist.venue && (
                      <p className="text-xs text-muted-foreground">{setlist.venue}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(setlist.id)}
                    disabled={deletingId === setlist.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-medium text-foreground">Prochains événements</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Chargement...
          </div>
        ) : setlists.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
            <Mic className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-base font-medium text-foreground">Aucun événement</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crée des shows dans Stage Prep pour les voir ici.
            </p>
          </div>
        ) : (
          setlists.map((setlist) => {
            const { day, date } = formatDate(setlist.event_date);
            return (
              <div
                key={setlist.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:bg-accent/50 transition"
              >
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-xs text-muted-foreground uppercase">{day}</p>
                  <p className="text-lg font-bold text-cyan-400">{date}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                  <Mic className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium text-foreground">{setlist.event_name}</p>
                  <p className="text-sm text-cyan-400">Show</p>
                  {setlist.venue && (
                    <p className="text-xs text-muted-foreground mt-1">{setlist.venue}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(setlist.id)}
                  disabled={deletingId === setlist.id}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-50"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
