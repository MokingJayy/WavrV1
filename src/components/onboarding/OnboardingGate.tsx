"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FolderPlus, Link2, Music, Loader2, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EXEMPT_PATHS = ["/projects", "/settings"];

function extractToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/join\/([a-f0-9-]{36})/i);
  return match ? match[1] : trimmed;
}

interface Props {
  hasProjects: boolean;
  userId: string;
  children: React.ReactNode;
}

export default function OnboardingGate({ hasProjects, userId, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isExempt = EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasProjects || isExempt) return <>{children}</>;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("projects")
      .insert({ name: name.trim(), description: description.trim() || null, created_by: userId })
      .select("id")
      .single();

    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/projects/${data.id}`);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(linkInput);
    if (!token || loading) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase.rpc("use_project_invitation", { p_token: token });

    if (err || data?.error) { setError(data?.error ?? err?.message ?? "Lien invalide."); setLoading(false); return; }
    router.push(`/projects/${data.project_id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <Music className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenue sur Wavr</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
            Pour accéder aux modules, commence par créer un projet ou rejoindre celui d'un collaborateur.
          </p>
        </div>
      </div>

      {/* Cards */}
      {mode === "idle" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          {/* Create */}
          <button
            onClick={() => setMode("create")}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 text-left hover:border-primary/40 hover:bg-accent/50 transition-all"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition">
              <FolderPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Créer un projet</p>
              <p className="text-xs text-muted-foreground mt-1">Démarre un nouveau projet et invite tes collaborateurs.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition" />
          </button>

          {/* Join */}
          <button
            onClick={() => setMode("join")}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 text-left hover:border-primary/40 hover:bg-accent/50 transition-all"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 group-hover:bg-violet-500/20 transition">
              <Link2 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Rejoindre un projet</p>
              <p className="text-xs text-muted-foreground mt-1">Colle un lien d'invitation partagé par ton équipe.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-400 group-hover:translate-x-1 transition" />
          </button>
        </div>
      )}

      {/* Create form */}
      {mode === "create" && (
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Nouveau projet</h2>
            </div>
            <button onClick={() => { setMode("idle"); setError(null); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nom du projet <span className="text-destructive">*</span></label>
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
              <label className="text-xs font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optionnel)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décris ton projet…"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>
            {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Créer le projet
            </button>
          </form>
        </div>
      )}

      {/* Join form */}
      {mode === "join" && (
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-foreground">Rejoindre un projet</h2>
            </div>
            <button onClick={() => { setMode("idle"); setError(null); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleJoin} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Lien d'invitation</label>
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://…/join/token ou colle le token directement"
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
              <p className="text-[10px] text-muted-foreground">Colle l'URL complète ou le token seul.</p>
            </div>
            {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !linkInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Rejoindre le projet
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
