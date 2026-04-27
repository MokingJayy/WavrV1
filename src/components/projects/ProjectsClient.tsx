"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Users, ChevronRight, X, Loader2 } from "lucide-react";
import type { Project, ProjectMemberRole } from "@/types";

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: "Propriétaire",
  admin: "Admin",
  member: "Membre",
  viewer: "Lecteur",
};

const ROLE_COLORS: Record<ProjectMemberRole, string> = {
  owner: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  admin: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  member: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

interface ProjectWithRole extends Project {
  myRole: ProjectMemberRole;
}

interface Props {
  projects: ProjectWithRole[];
  userId: string;
}

export default function ProjectsClient({ projects: initial, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("projects")
      .insert({ name: name.trim(), description: description.trim() || null, created_by: userId })
      .select("*")
      .single();

    if (err) {
      setError(err.message);
      setCreating(false);
      return;
    }

    if (data) {
      setProjects((prev) => [{ ...(data as Project), myRole: "owner" }, ...prev]);
      setShowModal(false);
      setName("");
      setDescription("");
      router.push(`/projects/${data.id}`);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mes projets</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} projet{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus className="h-4 w-4" />
          Nouveau projet
        </button>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Aucun projet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crée ton premier projet ou rejoins-en un via un lien d'invitation.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            Créer un projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left hover:border-primary/30 hover:bg-accent/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition group-hover:translate-x-0.5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROLE_COLORS[project.myRole]}`}
                >
                  {ROLE_LABELS[project.myRole]}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {new Date(project.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">Nouveau projet</h3>
              <button
                onClick={() => { setShowModal(false); setError(null); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Nom du projet <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mon album, EP été 2025…"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décris ton projet (optionnel)"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null); }}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Créer le projet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
