"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  X, Play, History, Info, Download, 
  Trash2, FileAudio, Calendar, Clock, 
  ChevronRight, Plus, Loader2, Upload,
  Pencil, Check, Music2, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track, Profile } from "@/types";

interface TrackDetailProps {
  track: Track;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onDelete: (id: string) => void;
  onUpdate?: () => void;
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

export default function TrackDetail({ track, onClose, onPlay, onDelete, onUpdate, onVersionAdded }: TrackDetailProps) {
  const [versions, setVersions] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    version: "untitled",
    bpm: "",
    key: ""
  });
  const [saving, setSaving] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [versionEditForm, setVersionEditForm] = useState({
    title: "",
    version: "untitled",
    bpm: "",
    key: ""
  });
  const [savingVersion, setSavingVersion] = useState(false);

  const supabase = createClient();

  // Initialisation stable du formulaire
  useEffect(() => {
    if (track && !isEditing) {
      setEditForm({
        title: track.title || "",
        version: (track.version?.toLowerCase() || "untitled"),
        bpm: track.bpm?.toString() || "",
        key: track.key || ""
      });
    }
  }, [track.id, track.title, track.version, track.bpm, track.key]); // Retrait de isEditing des dépendances pour éviter les resets pendant l'édition

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

  const handleUpdateTrack = async () => {
    setSaving(true);
    console.log("[TrackDetail] Starting update with:", { trackId: track.id, editForm });
    const updateData = {
      title: editForm.title.trim(),
      version: editForm.version.toLowerCase(),
      bpm: editForm.bpm ? parseInt(editForm.bpm) : null,
      key: editForm.key.trim() || null
    };
    console.log("[TrackDetail] Prepared updateData:", updateData);

    const { error } = await supabase
      .from("tracks")
      .update(updateData)
      .eq("id", track.id);
    console.log("[TrackDetail] Supabase update result:", { error });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes("row-level security")) {
        alert("La base bloque la modification (RLS). Ajoute une policy UPDATE sur tracks.");
      } else if (lower.includes("check constraint") || lower.includes("tracks_version_check")) {
        alert("Version refusée par la base. Il faut étendre la contrainte version pour inclure map/maquette.");
      } else {
        alert(`Erreur lors de la mise à jour : ${error.message}`);
      }
    } else {
      console.log("[TrackDetail] Update successful, calling onUpdate");
      setIsEditing(false);
      onUpdate?.();
    }
    setSaving(false);
  };

  const handleEditVersion = (version: Track) => {
    setEditingVersionId(version.id);
    setVersionEditForm({
      title: version.title || "",
      version: (version.version?.toLowerCase() || "untitled"),
      bpm: version.bpm?.toString() || "",
      key: version.key || ""
    });
  };

  const handleUpdateVersion = async (versionId: string) => {
    setSavingVersion(true);
    const updateData = {
      title: versionEditForm.title.trim(),
      version: versionEditForm.version.toLowerCase(),
      bpm: versionEditForm.bpm ? parseInt(versionEditForm.bpm) : null,
      key: versionEditForm.key.trim() || null
    };

    const { error } = await supabase
      .from("tracks")
      .update(updateData)
      .eq("id", versionId);

    if (error) {
      alert(`Erreur lors de la mise à jour : ${error.message}`);
    } else {
      setEditingVersionId(null);
      await reloadVersions();
      onUpdate?.();
    }
    setSavingVersion(false);
  };

  const handleCancelVersionEdit = () => {
    setEditingVersionId(null);
    setVersionEditForm({
      title: "",
      version: "untitled",
      bpm: "",
      key: ""
    });
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

  const versions_list = [
    { id: "maquette", label: "Maquette", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
    { id: "untitled", label: "Untitled", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
    { id: "mixup", label: "Mixup", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    { id: "map", label: "MAP", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    { id: "final", label: "Final", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { id: "master", label: "Master", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ];

  const currentVersionInfo = versions_list.find(v => v.id === editForm.version) || versions_list[1];

  return (
    <div className="fixed top-0 right-0 h-screen w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileAudio className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Titre du track"
                />
                
                <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/50 rounded-xl border border-border/50">
                  {versions_list.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, version: v.id }))}
                      className={cn(
                        "px-1 py-2 rounded-lg text-[7px] font-black uppercase tracking-tighter border transition-all flex items-center justify-center",
                        editForm.version === v.id 
                          ? cn(v.color, "border-current shadow-sm bg-white/10 opacity-100")
                          : "bg-transparent text-muted-foreground border-transparent hover:bg-white/5 opacity-40 hover:opacity-70"
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-foreground leading-tight truncate max-w-[200px]">
                  {track.title}
                </h3>
                <span className={cn(
                  "inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                  versions_list.find(v => v.id === track.version)?.color || "bg-secondary text-muted-foreground border-border"
                )}>
                  {track.version}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <button 
              onClick={handleUpdateTrack}
              disabled={saving}
              className="p-2 hover:bg-primary/10 rounded-full transition-colors text-primary disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">
        {/* Info Grid */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Informations</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={cn(
              "p-3 rounded-xl border transition-all relative group/input",
              isEditing ? "bg-secondary/50 border-primary/30 ring-1 ring-primary/20" : "bg-secondary/30 border-border/50"
            )}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">BPM</p>
                {isEditing && <Music2 className="h-3 w-3 text-primary/50" />}
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={editForm.bpm}
                  onChange={(e) => setEditForm({ ...editForm, bpm: e.target.value })}
                  placeholder="—"
                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-foreground focus:outline-none focus:ring-0 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              ) : (
                <p className="text-sm font-bold text-foreground">{track.bpm || "—"}</p>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-xl border transition-all relative group/input",
              isEditing ? "bg-secondary/50 border-primary/30 ring-1 ring-primary/20" : "bg-secondary/30 border-border/50"
            )}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Key</p>
                {isEditing && <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.key}
                  onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                  placeholder="—"
                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-foreground focus:outline-none focus:ring-0"
                />
              ) : (
                <p className="text-sm font-bold text-foreground">{track.key || "—"}</p>
              )}
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
              <div key={v.id}>
                {editingVersionId === v.id ? (
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                    <input
                      type="text"
                      value={versionEditForm.title}
                      onChange={(e) => setVersionEditForm({ ...versionEditForm, title: e.target.value })}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Titre du track"
                    />
                    <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/50 rounded-xl border border-border/50">
                      {versions_list.map((ver) => (
                        <button
                          key={ver.id}
                          type="button"
                          onClick={() => setVersionEditForm(prev => ({ ...prev, version: ver.id }))}
                          className={cn(
                            "px-1 py-2 rounded-lg text-[7px] font-black uppercase tracking-tighter border transition-all flex items-center justify-center",
                            versionEditForm.version === ver.id
                              ? cn(ver.color, "border-current shadow-sm bg-white/10 opacity-100")
                              : "bg-transparent text-muted-foreground border-transparent hover:bg-white/5 opacity-40 hover:opacity-70"
                          )}
                        >
                          {ver.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={versionEditForm.bpm}
                        onChange={(e) => setVersionEditForm({ ...versionEditForm, bpm: e.target.value })}
                        placeholder="BPM"
                        className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <input
                        type="text"
                        value={versionEditForm.key}
                        onChange={(e) => setVersionEditForm({ ...versionEditForm, key: e.target.value })}
                        placeholder="Key"
                        className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateVersion(v.id)}
                        disabled={savingVersion}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                      >
                        {savingVersion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Sauvegarder
                      </button>
                      <button
                        onClick={handleCancelVersionEdit}
                        className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-xs font-bold hover:bg-accent transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditVersion(v); }}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded-lg text-muted-foreground transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(v.file_url, '_blank'); }}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded-lg text-muted-foreground transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
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
