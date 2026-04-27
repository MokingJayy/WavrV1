"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Save,
  Trash2,
  Play,
  Pause,
  Music2,
  Loader2,
  Check,
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  version: string;
  bpm: number | null;
  key: string | null;
  file_url: string;
  project_id: string | null;
  created_at: string;
  duration_seconds: number | null;
}

interface Project {
  id: string;
  name: string;
}

const VERSIONS = ["demo", "rough-mix", "mixup", "pre-master", "master", "final"] as const;
const versionLabels: Record<string, string> = {
  "demo": "Demo",
  "rough-mix": "Rough Mix",
  "mixup": "Mixup",
  "pre-master": "Pre-Master",
  "final": "Final",
  "master": "Master",
};
const versionColors: Record<string, string> = {
  "demo": "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  "rough-mix": "border-blue-500/30 bg-blue-500/10 text-blue-300",
  "mixup": "border-violet-500/30 bg-violet-500/10 text-violet-300",
  "pre-master": "border-orange-500/30 bg-orange-500/10 text-orange-300",
  "final": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "master": "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

const MUSICAL_KEYS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
];

function formatTime(s: number) {
  if (isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function TrackSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [track, setTrack] = useState<Track | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("untitled");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const fetchData = useCallback(async () => {
    const [{ data: trackData }, { data: projectsData }] = await Promise.all([
      supabase.from("tracks").select("*").eq("id", id).single(),
      supabase.from("projects").select("id, name").order("created_at", { ascending: false }),
    ]);
    if (trackData) {
      setTrack(trackData);
      setTitle(trackData.title);
      setVersion(trackData.version);
      setBpm(trackData.bpm?.toString() ?? "");
      setMusicalKey(trackData.key ?? "");
      setProjectId(trackData.project_id);
    }
    setProjects(projectsData ?? []);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("tracks").update({
      title,
      version,
      bpm: bpm ? parseInt(bpm) : null,
      key: musicalKey || null,
      project_id: projectId,
    }).eq("id", id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    await supabase.from("tracks").delete().eq("id", id);
    router.push("/vault");
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Chargement...</span>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Music2 className="h-8 w-8 opacity-30" />
        <p className="text-sm">Track introuvable.</p>
        <button onClick={() => router.push("/vault")} className="text-primary text-sm hover:underline">
          ← Retour au Vault
        </button>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/vault")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{track.title}</h2>
          <p className="text-xs text-muted-foreground">
            Ajouté le {new Date(track.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-2">
        <audio
          ref={audioRef}
          src={track.file_url}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <div className="flex-1 space-y-1">
            <div className="relative h-1.5 rounded-full bg-border overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const t = ratio * duration;
                if (audioRef.current) audioRef.current.currentTime = t;
                setCurrentTime(t);
              }}
            >
              <div className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Informations</h3>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Titre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Version</label>
          <div className="grid grid-cols-4 gap-2">
            {VERSIONS.map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`rounded-lg border py-2.5 text-xs font-medium capitalize transition ${
                  version === v
                    ? versionColors[v]
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {versionLabels[v]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">BPM</label>
            <input
              type="number"
              min={40}
              max={300}
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="ex: 140"
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tonalité</label>
            <select
              value={musicalKey}
              onChange={(e) => setMusicalKey(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            >
              <option value="">— Choisir —</option>
              {MUSICAL_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Projet</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setProjectId(null)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                !projectId
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Aucun
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setProjectId(p.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  projectId === p.id
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer le track
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Confirmer la suppression ?</span>
            <button onClick={handleDelete} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition">
              Oui, supprimer
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition">
              Annuler
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
        >
          {saved ? (
            <><Check className="h-4 w-4" /> Sauvegardé</>
          ) : saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</>
          ) : (
            <><Save className="h-4 w-4" /> Sauvegarder</>
          )}
        </button>
      </div>
    </div>
  );
}
