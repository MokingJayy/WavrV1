"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import NotificationBell from "@/components/layout/NotificationBell";

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
  "/projects": { title: "Projets", description: "Gestion et collaboration" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface HeaderProps {
  profile: Pick<Profile, "full_name" | "role" | "avatar_url"> | null;
  email?: string;
}

export default function Header({ profile, email = "" }: HeaderProps) {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? { title: "Wavr", description: "" };
  const initials = profile?.full_name
    ? getInitials(profile.full_name)
    : email
    ? email[0].toUpperCase()
    : "?";
  const isSettings = pathname === "/settings";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-base font-semibold text-foreground">{page.title}</h1>
        {page.description && (
          <p className="text-xs text-muted-foreground">{page.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <GlobalSearch />
        <NotificationBell />

        <Link
          href="/settings"
          title="Mon profil"
          className={cn(
            "ml-2 flex h-8 w-8 items-center justify-center rounded-full border overflow-hidden text-xs font-semibold transition-all hover:scale-105",
            isSettings
              ? "border-primary shadow-md shadow-primary/30"
              : "border-primary/20 hover:border-primary/40"
          )}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={initials}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className={cn(
              "flex h-full w-full items-center justify-center",
              isSettings ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
            )}>
              {initials}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
