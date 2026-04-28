"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Music2, MoreHorizontal, Loader2, Play, Plus, FolderOpen, X } from "lucide-react";
import VaultUpload from "@/components/vault/VaultUpload";
import VaultPlayer from "@/components/vault/VaultPlayer";
import TrackDetail from "@/components/vault/TrackDetail";

interface Track {
  id: string;
  title: string;
  version: string;
  bpm: number | null;
  key: string | null;
  duration_seconds: number | null;
  file_url: string;
  project_id: string | null;
  created_at: string;
  parent_id?: string | null;
}

interface Project {
  id: string;
  name: string;
}

const versionColors: Record<string, string> = {
  "maquette": "bg-zinc-500/10 text-zinc-400",
  "untitled": "bg-zinc-500/10 text-zinc-400",
  "rough-mix": "bg-blue-500/10 text-blue-400",
  "mixup": "bg-violet-500/10 text-violet-400",
  "map": "bg-orange-500/10 text-orange-400",
  "pre-master": "bg-orange-500/10 text-orange-400",
  "final": "bg-emerald-500/10 text-emerald-400",
  "master": "bg-amber-500/10 text-amber-400",
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

interface VaultPageProps {
  projectId?: string;
}

export default function VaultPage({ projectId }: VaultPageProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [detailTrack, setDetailTrack] = useState<Track | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(projectId || null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    console.log("[VaultPage] fetchData called");
    setLoading(true);
    const query = supabase.from("tracks").select("*").order("created_at", { ascending: false });
    
    if (projectId) {
      query.eq("project_id", projectId);
    }

    const [{ data: tracksData }, { data: projectsData }] = await Promise.all([
      query,
      projectId ? { data: [] } : supabase.from("projects").select("id, name").order("created_at", { ascending: false }),
    ]);

    console.log("[VaultPage] Fetched tracks:", tracksData);
    setTracks(tracksData ?? []);
    if (!projectId) {
      setProjects(projectsData ?? []);
    }
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (detailTrack) {
      const updated = tracks.find(t => t.id === detailTrack.id);
      if (updated && (
        updated.title !== detailTrack.title || 
        updated.version !== detailTrack.version || 
        updated.bpm !== detailTrack.bpm || 
        updated.key !== detailTrack.key
      )) {
        setDetailTrack(updated);
      }
    }
  }, [tracks, detailTrack]);

  useEffect(() => {
    if (projectId) setActiveProject(projectId);
  }, [projectId]);

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Tu dois être connecté pour créer un projet.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({ name: newProjectName.trim(), created_by: user.id })
      .select("id, name")
      .single();

    if (error) {
      alert(`Erreur création projet : ${error.message}`);
      return;
    }

    if (data) {
      // Ajouter l'utilisateur comme owner du projet
      await supabase.from("project_members").insert({
        project_id: data.id,
        user_id: user.id,
        role: "owner",
      });

      setProjects((prev) => [data, ...prev]);
      setActiveProject(data.id);
    }
    setNewProjectName("");
    setCreatingProject(false);
  };

  const filteredTracks = useMemo(() => {
    const list = activeProject
      ? tracks.filter((t) => t.project_id === activeProject)
      : tracks;

    // Ne montrer que les tracks qui n'ont pas de parent (les versions "maitres")
    // Ou la version la plus récente si on veut un comportement différent
    return list.filter(t => !t.parent_id);
  }, [tracks, activeProject]);

  const deleteTrack = async (id: string) => {
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (!error) {
      setTracks((prev) => prev.filter((t) => t.id !== id));
      setDetailTrack(null);
      if (activeTrack?.id === id) setActiveTrack(null);
    }
  };

  const deleteProject = async (projectId: string) => {
    await supabase.from("tracks").update({ project_id: null }).eq("project_id", projectId);
    await supabase.from("projects").delete().eq("id", projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTracks((prev) => prev.map((t) => t.project_id === projectId ? { ...t, project_id: null } : t));
    if (activeProject === projectId) setActiveProject(null);
    setConfirmDeleteId(null);
  };

  const moveTrackToProject = async (trackId: string, projectId: string | null) => {
    await supabase.from("tracks").update({ project_id: projectId }).eq("id", trackId);
    setTracks((prev) =>
      prev.map((t) => t.id === trackId ? { ...t, project_id: projectId } : t)
    );
  };

  const onDragStart = (trackId: string) => setDraggingTrackId(trackId);
  const onDragEnd = () => { setDraggingTrackId(null); setDragOverTarget(null); };
  const onDragOver = (e: React.DragEvent, target: string) => { e.preventDefault(); setDragOverTarget(target); };
  const onDragLeave = () => setDragOverTarget(null);
  const onDrop = (e: React.DragEvent, projectId: string | null) => {
    e.preventDefault();
    if (draggingTrackId) moveTrackToProject(draggingTrackId, projectId);
    setDraggingTrackId(null);
    setDragOverTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">The Vault</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Versions audio & lecteur Hi-Fi</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveProject(null)}
          onDragOver={(e) => onDragOver(e, "all")}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, null)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            dragOverTarget === "all"
              ? "bg-primary/20 text-primary border border-primary scale-105"
              : activeProject === null
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          Tous ({tracks.length})
        </button>

        {projects.map((p) => (
          confirmDeleteId === p.id ? (
            <div key={p.id} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm">
              <span className="text-destructive text-xs font-medium">Supprimer &quot;{p.name}&quot; ?</span>
              <button
                onClick={() => deleteProject(p.id)}
                className="rounded px-1.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition"
              >
                Oui
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Non
              </button>
            </div>
          ) : (
            <div
              key={p.id}
              className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                dragOverTarget === p.id
                  ? "bg-primary/20 text-primary border border-primary scale-105"
                  : activeProject === p.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
              }`}
              onDragOver={(e) => onDragOver(e, p.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, p.id)}
            >
              <button className="flex items-center gap-1.5" onClick={() => setActiveProject(p.id)}>
                <FolderOpen className="h-3.5 w-3.5" />
                {p.name}
                <span className="text-xs opacity-60">({tracks.filter((t) => t.project_id === p.id).length})</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                className="ml-0.5 opacity-0 group-hover:opacity-100 rounded hover:text-destructive transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        ))}

        {creatingProject ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createProject(); if (e.key === "Escape") setCreatingProject(false); }}
              placeholder="Nom du projet..."
              className="rounded-lg border border-primary/30 bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button onClick={createProject} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition">
              Créer
            </button>
            <button onClick={() => setCreatingProject(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingProject(true)}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau projet
          </button>
        )}
      </div>

      <VaultUpload onUploaded={fetchData} projectId={activeProject} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-border">
          <div className="w-7 shrink-0" />
          <div className="flex-1 min-w-0">Titre</div>
          <div className="w-28 shrink-0">Version</div>
          <div className="w-20 shrink-0 text-right">BPM</div>
          <div className="w-14 shrink-0 text-right">Durée</div>
          <div className="w-6 shrink-0" />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Chargement...</span>
          </div>
        )}

        {!loading && filteredTracks.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {activeProject
              ? "Aucun son dans ce projet — uploade ci-dessus."
              : "Aucun track pour l'instant — uploade le premier ci-dessus."}
          </div>
        )}

        {filteredTracks.map((track) => (
          <div
            key={track.id}
            draggable
            onDragStart={() => onDragStart(track.id)}
            onDragEnd={onDragEnd}
            onClick={() => setDetailTrack(track)}
            className={`flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition group border-b border-border last:border-0 cursor-pointer ${
              draggingTrackId === track.id ? "opacity-40 scale-[0.99]" : ""
            } ${
              detailTrack?.id === track.id ? "bg-primary/5 shadow-[inset_2px_0_0_hsl(var(--primary))]" : ""
            }`}
          >
            <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md bg-secondary group-hover:bg-primary/10 transition">
              {activeTrack?.id === track.id
                ? <Play className="h-3.5 w-3.5 text-primary" />
                : <Music2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(track.created_at)}</p>
            </div>
            <div className="w-28 shrink-0">
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${versionColors[track.version] ?? "bg-zinc-500/10 text-zinc-400"}`}>
                {track.version}
              </span>
            </div>
            <div className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {track.bpm ? `${track.bpm} BPM` : "—"}
            </div>
            <div className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {formatDuration(track.duration_seconds)}
            </div>
            <div className="w-6 shrink-0 flex justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); setDetailTrack(track); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition opacity-0 group-hover:opacity-100 flex items-center"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {detailTrack && (
        <TrackDetail 
          track={detailTrack} 
          onClose={() => setDetailTrack(null)}
          onPlay={(t) => setActiveTrack(t)}
          onDelete={deleteTrack}
          onUpdate={fetchData}
          onVersionAdded={fetchData}
        />
      )}

      {activeTrack && (
        <VaultPlayer
          track={activeTrack}
          onClose={() => setActiveTrack(null)}
        />
      )}
    </div>
  );
}
