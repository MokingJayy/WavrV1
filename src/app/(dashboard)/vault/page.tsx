"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Music2, MoreHorizontal, Loader2, Play } from "lucide-react";
import VaultUpload from "@/components/vault/VaultUpload";
import VaultPlayer from "@/components/vault/VaultPlayer";

interface Track {
  id: string;
  title: string;
  version: string;
  bpm: number | null;
  duration_seconds: number | null;
  file_url: string;
  created_at: string;
}

const versionColors: Record<string, string> = {
  mixup: "bg-violet-500/10 text-violet-400",
  untitled: "bg-zinc-500/10 text-zinc-400",
  final: "bg-emerald-500/10 text-emerald-400",
  master: "bg-amber-500/10 text-amber-400",
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function VaultPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const supabase = createClient();

  const fetchTracks = useCallback(async () => {
    const { data } = await supabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false });
    setTracks(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">The Vault</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Versions audio & lecteur Hi-Fi</p>
      </div>

      <VaultUpload onUploaded={fetchTracks} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-border">
          <span>#</span>
          <span>Titre</span>
          <span>Version</span>
          <span>BPM</span>
          <span>Durée</span>
          <span></span>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Chargement...</span>
          </div>
        )}

        {!loading && tracks.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aucun track pour l'instant — uploade le premier ci-dessus.
          </div>
        )}

        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => setSelectedTrack(track)}
            className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-accent/50 transition group border-b border-border last:border-0 cursor-pointer ${
              selectedTrack?.id === track.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary group-hover:bg-primary/10 transition">
              {selectedTrack?.id === track.id
                ? <Play className="h-3.5 w-3.5 text-primary" />
                : <Music2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition" />
              }
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{track.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(track.created_at)}</p>
            </div>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${versionColors[track.version] ?? "bg-zinc-500/10 text-zinc-400"}`}>
              {track.version}
            </span>
            <span className="text-xs text-muted-foreground">
              {track.bpm ? `${track.bpm} BPM` : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDuration(track.duration_seconds)}
            </span>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {selectedTrack && (
        <VaultPlayer
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
        />
      )}
    </div>
  );
}
