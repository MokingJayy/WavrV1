"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Plus, GripVertical, Music2, Download, FileText, List, Edit2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const setlist = [
  { id: "1", order: 1, title: "Intro", bpm: 128, duration: "1:20", key: "Am" },
  { id: "2", order: 2, title: "Track 01", bpm: 140, duration: "3:42", key: "Gm" },
  { id: "3", order: 3, title: "Untitled_02", bpm: 95, duration: "2:58", key: "Fm" },
];

interface TechnicalSheet {
  id: string;
  event_name: string;
  event_date: string;
  venue: string;
  bpm_notes: string;
  technical_rider_url: string | null;
  created_at: string;
}

export default function StagePage() {
  const [activeTab, setActiveTab] = useState<"setlist" | "sheets">("setlist");
  const [technicalSheets, setTechnicalSheets] = useState<TechnicalSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [newSheet, setNewSheet] = useState({
    event_name: "",
    event_date: "",
    venue: "",
    bpm_notes: "",
  });
  const supabase = createClient();

  const fetchSheets = useCallback(async () => {
    const { data } = await supabase
      .from("stage_setlists")
      .select("*")
      .order("created_at", { ascending: false });
    setTechnicalSheets(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);

  const createSheet = async () => {
    if (!newSheet.event_name.trim()) return;

    const { error } = await supabase.from("stage_setlists").insert({
      event_name: newSheet.event_name.trim(),
      event_date: newSheet.event_date,
      venue: newSheet.venue.trim(),
      bpm_notes: newSheet.bpm_notes.trim(),
      track_ids: [],
    });

    if (error) {
      alert(`Erreur création fiche : ${error.message}`);
    } else {
      setNewSheet({ event_name: "", event_date: "", venue: "", bpm_notes: "" });
      setIsCreatingSheet(false);
      fetchSheets();
    }
  };

  const deleteSheet = async (id: string) => {
    await supabase.from("stage_setlists").delete().eq("id", id);
    setTechnicalSheets((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stage Prep</h2>
          <p className="text-sm text-muted-foreground mt-0.5">BPM, setlists & fiches techniques live</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "setlist" && (
            <>
              <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition">
                <Download className="h-4 w-4" />
                Exporter fiche
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
                <Plus className="h-4 w-4" />
                Nouvelle setlist
              </button>
            </>
          )}
          {activeTab === "sheets" && (
            <button
              onClick={() => setIsCreatingSheet(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus className="h-4 w-4" />
              Nouvelle fiche
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("setlist")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "setlist"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-4 w-4" />
          Setlist
        </button>
        <button
          onClick={() => setActiveTab("sheets")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "sheets"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Fiches techniques
        </button>
      </div>

      {activeTab === "setlist" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Tracks</p>
              <p className="text-2xl font-bold text-cyan-400">{setlist.length}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">BPM moyen</p>
              <p className="text-2xl font-bold text-cyan-400">
                {Math.round(setlist.reduce((a, t) => a + t.bpm, 0) / setlist.length)}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Durée totale</p>
              <p className="text-2xl font-bold text-cyan-400">~8 min</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <Mic className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Setlist — Show Paris</span>
            </div>

            <div className="divide-y divide-border">
              {setlist.map((track) => (
                <div key={track.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-accent/50 transition">
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab" />
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-400 flex-shrink-0">
                    {track.order}
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary flex-shrink-0">
                    <Music2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{track.title}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono bg-secondary rounded px-1.5 py-0.5">{track.key}</span>
                    <span>{track.bpm} BPM</span>
                    <span>{track.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "sheets" && (
        <>
          {isCreatingSheet && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Nouvelle fiche technique</h3>
                <button
                  onClick={() => setIsCreatingSheet(false)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Nom de l'événement</label>
                  <input
                    type="text"
                    value={newSheet.event_name}
                    onChange={(e) => setNewSheet({ ...newSheet, event_name: e.target.value })}
                    placeholder="Ex: Show Paris"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={newSheet.event_date}
                    onChange={(e) => setNewSheet({ ...newSheet, event_date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-muted-foreground">Lieu / Venue</label>
                  <input
                    type="text"
                    value={newSheet.venue}
                    onChange={(e) => setNewSheet({ ...newSheet, venue: e.target.value })}
                    placeholder="Ex: Olympia"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-muted-foreground">Équipement / BPM notes</label>
                  <textarea
                    value={newSheet.bpm_notes}
                    onChange={(e) => setNewSheet({ ...newSheet, bpm_notes: e.target.value })}
                    placeholder="Liste de l'équipement nécessaire, notes BPM..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsCreatingSheet(false); setNewSheet({ event_name: "", event_date: "", venue: "", bpm_notes: "" }); }}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Annuler
                </button>
                <button
                  onClick={createSheet}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
                >
                  Créer
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading && (
              <div className="py-12 flex items-center justify-center text-muted-foreground">
                Chargement...
              </div>
            )}
            {!loading && (
              <div className="divide-y divide-border">
                {technicalSheets.map((sheet) => (
                  <div key={sheet.id} className="px-4 py-4 hover:bg-accent/50 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{sheet.event_name}</h3>
                        <p className="text-xs text-muted-foreground">{sheet.venue} • {sheet.event_date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteSheet(sheet.id)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {sheet.bpm_notes && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Notes:</span> {sheet.bpm_notes}
                      </p>
                    )}
                  </div>
                ))}
                {technicalSheets.length === 0 && (
                  <div className="py-12 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aucune fiche technique pour l'instant.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
