"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Play, Pause, Plus, CheckCircle2, MessageSquareDot,
  Loader2, Trash2, Music2, X, ChevronDown, Ticket,
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  version: string;
  file_url: string;
  duration_seconds: number | null;
}

interface Cue {
  id: string;
  track_id: string;
  timestamp_seconds: number;
  author_id: string | null;
  content: string;
  resolved: boolean;
  created_at: string;
}

function formatTime(s: number) {
  if (isNaN(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function FeedbackPage() {
  const supabase = createClient();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingCues, setLoadingCues] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [addingCue, setAddingCue] = useState(false);
  const [cueTimestamp, setCueTimestamp] = useState(0);
  const [cueContent, setCueContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    const { data } = await supabase.from("tracks").select("id, title, version, file_url, duration_seconds").order("created_at", { ascending: false });
    setTracks(data ?? []);
    setLoadingTracks(false);
  }, [supabase]);

  const fetchCues = useCallback(async (trackId: string) => {
    setLoadingCues(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("cues")
      .select("*")
      .eq("track_id", trackId)
      .order("timestamp_seconds", { ascending: true });
    if (error) setFetchError(error.message);
    setCues(data ?? []);
    setLoadingCues(false);
  }, [supabase]);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  const selectTrack = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackPicker(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(track.duration_seconds ?? 0);
    setAddingCue(false);
    fetchCues(track.id);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const seekTo = (ratio: number) => {
    const t = ratio * duration;
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const openAddCue = () => {
    setCueTimestamp(currentTime);
    setAddingCue(true);
  };

  const saveCue = async () => {
    if (!selectedTrack || !cueContent.trim()) return;
    setSaving(true);
    setSaveError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cues").insert({
      track_id: selectedTrack.id,
      timestamp_seconds: Math.round(cueTimestamp * 10) / 10,
      author_id: user?.id,
      content: cueContent.trim(),
      resolved: false,
    }).select().single();
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    await fetchCues(selectedTrack.id);
    setCueContent("");
    setAddingCue(false);
    setSaving(false);
  };

  const toggleResolved = async (cue: Cue) => {
    await supabase.from("cues").update({ resolved: !cue.resolved }).eq("id", cue.id);
    setCues((prev) => prev.map((c) => c.id === cue.id ? { ...c, resolved: !c.resolved } : c));
  };

  const deleteCue = async (id: string) => {
    await supabase.from("cues").delete().eq("id", id);
    setCues((prev) => prev.filter((c) => c.id !== id));
  };

  const createTicketFromCue = async (cue: Cue) => {
    if (!selectedTrack) return;

    // Get project_id from track
    const { data: trackData } = await supabase
      .from("tracks")
      .select("project_id")
      .eq("id", selectedTrack.id)
      .single();

    if (!trackData?.project_id) {
      alert("Impossible de créer le ticket : pas de projet associé");
      return;
    }

    // Create channel for the ticket
    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .insert({
        name: `Ticket-${cue.id}-${Date.now()}`,
      })
      .select()
      .single();

    if (channelError) {
      alert(`Erreur création channel : ${channelError.message}`);
      return;
    }

    // Create ticket linked to cue and channel
    const { error: ticketError } = await supabase
      .from("tickets")
      .insert({
        title: `Ticket from cue @ ${formatTime(cue.timestamp_seconds)}`,
        description: cue.content,
        cue_id: cue.id,
        track_id: selectedTrack.id,
        project_id: trackData.project_id,
        channel_id: channelData.id,
        status: "open",
      });

    if (ticketError) {
      alert(`Erreur création ticket : ${ticketError.message}`);
      return;
    }

    alert("Ticket créé avec channel de chat !");
  };

  const seekToCue = (ts: number) => {
    if (audioRef.current) audioRef.current.currentTime = ts;
    setCurrentTime(ts);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Cue & Feedback</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Commentaires temporels sur tes tracks</p>
      </div>

      {/* Track selector */}
      <div className="relative">
        <button
          onClick={() => setShowTrackPicker((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-accent/50"
        >
          <div className="flex items-center gap-3">
            <Music2 className="h-4 w-4 text-muted-foreground" />
            {selectedTrack ? (
              <span className="font-medium text-foreground">{selectedTrack.title}</span>
            ) : (
              <span className="text-muted-foreground">Sélectionner un track…</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showTrackPicker ? "rotate-180" : ""}`} />
        </button>

        {showTrackPicker && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {loadingTracks ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement…</span>
              </div>
            ) : tracks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun track dans The Vault.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto py-1">
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTrack(t)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-accent ${selectedTrack?.id === t.id ? "bg-primary/10 text-primary" : "text-foreground"}`}
                  >
                    <Music2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-left truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{t.version}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player + timeline */}
      {selectedTrack && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <audio
            ref={audioRef}
            src={selectedTrack.file_url}
            preload="metadata"
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
            onEnded={() => setPlaying(false)}
          />

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <div className="flex-1 space-y-1">
              {/* Timeline avec marqueurs de cues */}
              <div
                className="relative h-8 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekTo((e.clientX - rect.left) / rect.width);
                }}
              >
                {/* Barre de fond */}
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                {/* Marqueurs cues */}
                {duration > 0 && cues.map((cue) => (
                  <div
                    key={cue.id}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-card transition-transform hover:scale-150 z-10 cursor-pointer ${cue.resolved ? "bg-emerald-500" : "bg-blue-400"}`}
                    style={{ left: `${(cue.timestamp_seconds / duration) * 100}%` }}
                    title={`${formatTime(cue.timestamp_seconds)} · ${cue.author}`}
                    onClick={(e) => { e.stopPropagation(); seekToCue(cue.timestamp_seconds); }}
                  />
                ))}
                {/* Curseur */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-primary border-2 border-card shadow z-20 pointer-events-none"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Ajouter un cue */}
          {addingCue ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">
                  Nouveau cue à <span className="font-mono">{formatTime(cueTimestamp)}</span>
                </span>
                <button onClick={() => { setAddingCue(false); setSaveError(null); }} className="text-muted-foreground hover:text-foreground transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="number"
                value={Math.round(cueTimestamp * 10) / 10}
                onChange={(e) => setCueTimestamp(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder="Timestamp (secondes)"
              />
              <textarea
                value={cueContent}
                onChange={(e) => setCueContent(e.target.value)}
                placeholder="Ton commentaire…"
                rows={2}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none"
              />
              {saveError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Erreur : {saveError}
                </p>
              )}
              <button
                onClick={saveCue}
                disabled={saving || !cueContent.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter le cue
              </button>
            </div>
          ) : (
            <button
              onClick={openAddCue}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition"
            >
              <Plus className="h-4 w-4" />
              Ajouter un cue à {formatTime(currentTime)}
            </button>
          )}
        </div>
      )}

      {/* Liste des cues */}
      {selectedTrack && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Cues <span className="text-muted-foreground font-normal">({cues.length})</span>
            </h3>
            <button
              onClick={() => selectedTrack && fetchCues(selectedTrack.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              ↻ Rafraîchir
            </button>
          </div>

          {fetchError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Erreur lecture : {fetchError}
            </div>
          )}

          {loadingCues ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : cues.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-10 text-center">
              <MessageSquareDot className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun cue pour ce track.</p>
            </div>
          ) : (
            cues.map((cue) => (
              <div
                key={cue.id}
                className={`group flex items-start gap-3 rounded-xl border p-4 transition ${
                  cue.resolved
                    ? "border-border bg-card opacity-60"
                    : "border-blue-500/20 bg-blue-500/5"
                }`}
              >
                <button
                  onClick={() => toggleResolved(cue)}
                  className="mt-0.5 shrink-0 transition hover:scale-110"
                  title={cue.resolved ? "Marquer non résolu" : "Marquer résolu"}
                >
                  {cue.resolved
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <MessageSquareDot className="h-4 w-4 text-blue-400" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <button
                      onClick={() => seekToCue(cue.timestamp_seconds)}
                      className="font-mono text-xs font-semibold text-blue-400 hover:underline tabular-nums"
                    >
                      {formatTime(cue.timestamp_seconds)}
                    </button>
                  </div>
                  <p className="text-sm text-foreground/80">{cue.content}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => createTicketFromCue(cue)}
                    className="mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition"
                    title="Créer un ticket"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCue(cue.id)}
                    className="mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
