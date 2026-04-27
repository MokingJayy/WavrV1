"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Music } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wavr</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto">
            <Clock className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Accès en attente</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Ton compte a bien été créé. Un administrateur doit approuver ton accès avant que tu puisses utiliser Wavr Studio.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Reviens ici une fois approuvé — tu seras automatiquement redirigé.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
