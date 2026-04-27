"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Vue d'ensemble du projet" },
  "/vault": { title: "The Vault", description: "Gestion audio & versions" },
  "/feedback": { title: "Cue & Feedback", description: "Commentaires sur la waveform" },
  "/chat": { title: "Studio Chat", description: "Messagerie par rôle" },
  "/timeline": { title: "Timeline", description: "Calendrier de sorties & sessions" },
  "/royalties": { title: "Royalties Hub", description: "Split sheets & contrats" },
  "/gallery": { title: "The Gallery", description: "Assets graphiques & covers" },
  "/stage": { title: "Stage Prep", description: "BPM & fiches techniques live" },
  "/settings": { title: "Paramètres", description: "Configuration du compte" },
};

export default function Header() {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? { title: "Wavr", description: "" };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-base font-semibold text-foreground">{page.title}</h1>
        {page.description && (
          <p className="text-xs text-muted-foreground">{page.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
          <Search className="h-4 w-4" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
        <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          PS
        </div>
      </div>
    </header>
  );
}
