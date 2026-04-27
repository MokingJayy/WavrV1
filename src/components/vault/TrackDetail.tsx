"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  X, Play, History, Info, Download, 
  Trash2, FileAudio, Calendar, Clock, 
  ChevronRight, Plus, Loader2, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track, Profile } from "@/types";

interface TrackDetailProps {
  track: Track;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onDelete: (id: string) => void;
  onVersionAdded?: () => void;
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(url); };
    audio.onerror = () => { resolve(0); URL.revokeObjectURL(url); };
    audio.src = url;
  });
}

export default function TrackDetail({ track, onClose, onPlay, onDelete, onVersionAdded }: TrackDetailProps) {
  const [versions, setVersions] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // Charger les versions (même parent_id ou si c'est le parent lui-même)
      const parentId = track.parent_id || track.id;
      const { data: versionsData } = await supabase
        .from("tracks")
        .select("*")
        .or(`id.eq.${parentId},parent_id.eq.${parentId}`)
        .order("created_at", { ascending: false });

      // Charger l'auteur
      const { data: authorData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", track.uploaded_by)
        .single();

      setVersions(versionsData ?? []);
      setAuthor(authorData as Profile);
      setLoading(false);
    }
    loadData();
  }, [track, supabase]);

  const reloadVersions = async () => {
    const parentId = track.parent_id || track.id;
    const { data: versionsData } = await supabase
      .from("tracks")
      .select("*")
      .or(`id.eq.${parentId},parent_id.eq.${parentId}`)
      .order("created_at", { ascending: false });
    setVersions(versionsData ?? []);
  };

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const allowed = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/aiff", "audio/x-aiff", "audio/flac"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(wav|mp3|aiff|flac|aif)$/i)) {
      setUploadError("Format non supporté. WAV, MP3, AIFF ou FLAC.");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setUploadError("Fichier trop lourd (max 500 MB).");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const durationSeconds = await getAudioDuration(file);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setUploadError(`Erreur upload : ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(uploadData.path);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setUploadError("Session expirée.");
      setUploading(false);
      return;
    }

    const parentId = track.parent_id || track.id;
    const title = file.name.replace(/\.[^/.]+$/, "");

    const { error: dbError } = await supabase.from("tracks").insert({
      title,
      version: "untitled",
      file_url: urlData.publicUrl,
      project_id: track.project_id,
      parent_id: parentId,
      uploaded_by: user.id,
      duration_seconds: durationSeconds > 0 ? Math.round(durationSeconds) : null,
    });

    if (dbError) {
      setUploadError(`Erreur DB : ${dbError.message}`);
    } else {
      await reloadVersions();
      onVersionAdded?.();
    }

    setUploading(false);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", { 
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" 
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed top-0 right-0 h-screen w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileAudio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground leading-tight truncate max-w-[200px]">
              {track.title}
            </h3>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              {track.version}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">
        {/* Info Grid */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Informations</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">BPM</p>
              <p className="text-sm font-bold text-foreground">{track.bpm || "—"}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Key</p>
              <p className="text-sm font-bold text-foreground">{track.key || "—"}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Durée</p>
              <p className="text-sm font-bold text-foreground">{formatDuration(track.duration_seconds)}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Format</p>
              <p className="text-sm font-bold text-foreground uppercase">{track.file_url.split('.').pop() || "Audio"}</p>
            </div>
          </div>
        </section>

        {/* Author & Date */}
        <section className="p-4 rounded-2xl bg-secondary/20 border border-border/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
              ) : (
                author?.full_name?.[0].toUpperCase() || "?"
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{author?.full_name || "Chargement..."}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Uploadé le {formatDate(track.created_at)}</p>
            </div>
          </div>
        </section>

        {/* Version History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <History className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-widest">Historique des versions</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {versions.length}
              </span>
              <label className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all",
                uploading 
                  ? "bg-primary/20 text-primary opacity-60 cursor-wait" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              )}>
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {uploading ? "Upload..." : "Nouvelle version"}
                <input
                  type="file"
                  accept=".wav,.mp3,.aiff,.aif,.flac"
                  className="hidden"
                  onChange={handleUploadNewVersion}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
              <X className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{uploadError}</p>
            </div>
          )}

          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : versions.map((v) => (
              <div 
                key={v.id}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                  v.id === track.id 
                    ? "bg-primary/5 border-primary/20 shadow-sm" 
                    : "bg-card border-border hover:bg-accent/50"
                )}
                onClick={() => onPlay(v)}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  v.id === track.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  <Play className="h-3.5 w-3.5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground truncate">{v.title}</p>
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase",
                      v.id === track.id ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      {v.version}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(v.created_at)}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); window.open(v.file_url, '_blank'); }}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded-lg text-muted-foreground transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 p-6 border-t border-border bg-card grid grid-cols-2 gap-3">
        <button 
          onClick={() => onDelete(track.id)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/20 text-destructive text-xs font-bold hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
        <button 
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          onClick={() => onPlay(track)}
        >
          <Play className="h-4 w-4 fill-current" />
          Écouter
        </button>
      </div>
    </div>
  );
}
