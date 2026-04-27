"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Pencil,
  Tag,
  Music,
  FolderOpen,
  Trash2,
  Check,
  ChevronRight,
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  version: string;
  bpm: number | null;
  project_id: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface TrackMenuProps {
  track: Track;
  projects: Project[];
  onUpdated: () => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

const VERSIONS = ["untitled", "mixup", "final", "master"] as const;
const versionLabels: Record<string, string> = {
  untitled: "Untitled",
  mixup: "Mixup",
  final: "Final",
  master: "Master",
};
const versionColors: Record<string, string> = {
  mixup: "text-violet-400",
  untitled: "text-zinc-400",
  final: "text-emerald-400",
  master: "text-amber-400",
};

export default function TrackMenu({ track, projects, onUpdated, onClose, anchorRef }: TrackMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const [view, setView] = useState<"main" | "rename" | "bpm" | "version" | "project" | "confirm-delete">("main");
  const [renameValue, setRenameValue] = useState(track.title);
  const [bpmValue, setBpmValue] = useState(track.bpm?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  const update = async (fields: Partial<Track>) => {
    setSaving(true);
    await supabase.from("tracks").update(fields).eq("id", track.id);
    onUpdated();
    onClose();
  };

  const deleteTrack = async () => {
    await supabase.from("tracks").delete().eq("id", track.id);
    onUpdated();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-8 z-50 w-52 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
      style={{ top: "50%", transform: "translateY(-50%)" }}
    >
      {view === "main" && (
        <div className="py-1">
          <p className="truncate px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
            {track.title}
          </p>
          <button onClick={() => setView("rename")} className="menu-item">
            <Pencil className="h-3.5 w-3.5" /> Renommer
          </button>
          <button onClick={() => setView("version")} className="menu-item">
            <Tag className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Version</span>
            <span className={`text-xs capitalize ${versionColors[track.version]}`}>{versionLabels[track.version]}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setView("bpm")} className="menu-item">
            <Music className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">BPM</span>
            <span className="text-xs text-muted-foreground">{track.bpm ?? "—"}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setView("project")} className="menu-item">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Projet</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button onClick={() => setView("confirm-delete")} className="menu-item text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          </div>
        </div>
      )}

      {view === "rename" && (
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Renommer</p>
          <input
            autoFocus
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") update({ title: renameValue });
              if (e.key === "Escape") onClose();
            }}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex gap-2">
            <button onClick={() => setView("main")} className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent transition">
              Annuler
            </button>
            <button
              onClick={() => update({ title: renameValue })}
              disabled={saving}
              className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              {saving ? "..." : "Valider"}
            </button>
          </div>
        </div>
      )}

      {view === "bpm" && (
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">BPM</p>
          <input
            autoFocus
            type="number"
            min={40}
            max={300}
            value={bpmValue}
            onChange={(e) => setBpmValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") update({ bpm: bpmValue ? parseInt(bpmValue) : null });
              if (e.key === "Escape") onClose();
            }}
            placeholder="ex: 140"
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex gap-2">
            <button onClick={() => setView("main")} className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent transition">
              Annuler
            </button>
            <button
              onClick={() => update({ bpm: bpmValue ? parseInt(bpmValue) : null })}
              disabled={saving}
              className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              {saving ? "..." : "Valider"}
            </button>
          </div>
        </div>
      )}

      {view === "version" && (
        <div className="py-1">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">Version</p>
          {VERSIONS.map((v) => (
            <button
              key={v}
              onClick={() => update({ version: v })}
              className="menu-item"
            >
              <span className={`flex-1 text-left capitalize ${versionColors[v]}`}>{versionLabels[v]}</span>
              {track.version === v && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}

      {view === "project" && (
        <div className="py-1">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">Changer de projet</p>
          <button onClick={() => update({ project_id: null })} className="menu-item">
            <span className="flex-1 text-left text-muted-foreground">Aucun projet</span>
            {!track.project_id && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
          {projects.map((p) => (
            <button key={p.id} onClick={() => update({ project_id: p.id })} className="menu-item">
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">{p.name}</span>
              {track.project_id === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}

      {view === "confirm-delete" && (
        <div className="p-3 space-y-3">
          <p className="text-sm font-medium text-foreground">Supprimer ce track ?</p>
          <p className="text-xs text-muted-foreground">Cette action est irréversible.</p>
          <div className="flex gap-2">
            <button onClick={() => setView("main")} className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent transition">
              Annuler
            </button>
            <button
              onClick={deleteTrack}
              className="flex-1 rounded-lg bg-destructive py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
