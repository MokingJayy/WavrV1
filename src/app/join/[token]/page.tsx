"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Music, Loader2, Check, AlertCircle, FolderOpen } from "lucide-react";

type State = "loading" | "preview" | "joining" | "success" | "error" | "already";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [state, setState] = useState<State>("loading");
  const [projectName, setProjectName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: inv } = await supabase
        .from("project_invitations")
        .select("*, project:projects(name, description)")
        .eq("token", token)
        .single();

      if (!inv) { setErrorMsg("Invitation introuvable ou invalide."); setState("error"); return; }
      if (new Date(inv.expires_at) < new Date()) { setErrorMsg("Ce lien d'invitation a expiré."); setState("error"); return; }
      if (inv.use_count >= inv.max_uses) { setErrorMsg("Ce lien a atteint son nombre maximum d'utilisations."); setState("error"); return; }

      const project = inv.project as { name: string };
      setProjectName(project?.name ?? "Projet sans nom");
      setProjectId(inv.project_id);
      setState("preview");
    };
    load();
  }, [token, supabase]);

  const handleJoin = async () => {
    setState("joining");
    const { data, error } = await supabase.rpc("use_project_invitation", { p_token: token });

    if (error || data?.error) {
      setErrorMsg(data?.error ?? error?.message ?? "Une erreur est survenue.");
      setState("error");
      return;
    }

    const pid = data?.project_id ?? projectId;
    if (data?.already_member) {
      setState("already");
      setTimeout(() => router.push(`/projects/${pid}`), 1500);
      return;
    }

    setState("success");
    setTimeout(() => router.push(`/projects/${pid}`), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wavr</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement de l'invitation…</p>
            </div>
          )}

          {state === "preview" && (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <FolderOpen className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tu es invité à rejoindre</p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">{projectName}</h2>
                </div>
              </div>
              <button
                onClick={handleJoin}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
              >
                Rejoindre le projet
              </button>
            </>
          )}

          {state === "joining" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Rejoindre <strong className="text-foreground">{projectName}</strong>…</p>
            </div>
          )}

          {(state === "success" || state === "already") && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {state === "already" ? "Tu es déjà membre !" : "Tu as rejoint le projet !"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Redirection en cours…</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Invitation invalide</p>
                <p className="mt-1 text-xs text-muted-foreground">{errorMsg}</p>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-1 text-xs text-primary hover:underline"
              >
                Retour au dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
