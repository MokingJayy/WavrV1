"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Archive, Activity, MessageCircle, Calendar, FileText,
  Image, Mic, Settings, LogOut, Music, HardDrive,
  PanelLeftOpen, PanelLeftClose, FolderOpen, ArrowLeft, Users, ChevronRight,
} from "lucide-react";

const PROJECT_MODULES = [
  { name: "The Vault",      slug: "vault",     icon: Archive,        description: "Audio & versions" },
  { name: "Cue & Feedback", slug: "feedback",  icon: Activity,       description: "Commentaires waveform" },
  { name: "Studio Chat",    slug: "chat",      icon: MessageCircle,  description: "Messagerie" },
  { name: "Timeline",       slug: "timeline",  icon: Calendar,       description: "Calendrier" },
  { name: "Royalties Hub",  slug: "royalties", icon: FileText,       description: "Split sheets" },
  { name: "The Gallery",    slug: "gallery",   icon: Image,          description: "Assets & covers" },
  { name: "Sessions DAW",   slug: "sessions",  icon: HardDrive,      description: "Ableton · FL · Logic" },
  { name: "Stage Prep",     slug: "stage",     icon: Mic,            description: "BPM & fiches live" },
];

function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const projectId = extractProjectId(pathname);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300 overflow-hidden",
        open ? "w-60" : "w-16"
      )}
    >
      {/* Logo + toggle */}
      <div className="flex h-16 items-center border-b border-border px-2 gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
        >
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        {open && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-wide">Wavr</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {projectId ? (
          <>
            {/* Back to projects */}
            <Link
              href="/projects"
              title={!open ? "Tous les projets" : undefined}
              className={cn(
                "group flex items-center rounded-lg py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all mb-2",
                open ? "gap-3 px-3" : "justify-center px-2"
              )}
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              {open && <span>Tous les projets</span>}
            </Link>

            {/* Project overview */}
            <Link
              href={`/projects/${projectId}`}
              title={!open ? "Vue d'ensemble" : undefined}
              className={cn(
                "group flex items-center rounded-lg py-2 text-sm transition-all",
                open ? "gap-3 px-3" : "justify-center px-2",
                pathname === `/projects/${projectId}`
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              {open && "Vue d'ensemble"}
            </Link>

            {open && (
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Modules
              </p>
            )}
            {!open && <div className="my-2 border-t border-border/50" />}

            {/* Module links */}
            {PROJECT_MODULES.map((mod) => {
              const href = `/projects/${projectId}/${mod.slug}`;
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={mod.slug}
                  href={href}
                  title={!open ? mod.name : undefined}
                  className={cn(
                    "group flex items-center rounded-lg py-2 text-sm transition-all",
                    open ? "gap-3 px-3" : "justify-center px-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <mod.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {open && mod.name}
                </Link>
              );
            })}

            {/* Manage project */}
            <div className="pt-2">
              {open && <div className="border-t border-border/50 mb-2" />}
              <Link
                href={`/projects/${projectId}/manage`}
                title={!open ? "Gérer le projet" : undefined}
                className={cn(
                  "group flex items-center rounded-lg py-2 text-sm transition-all",
                  open ? "gap-3 px-3" : "justify-center px-2",
                  pathname.startsWith(`/projects/${projectId}/manage`)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                {open && "Membres & invitations"}
              </Link>
            </div>
          </>
        ) : (
          /* Home nav — no project selected */
          <Link
            href="/projects"
            title={!open ? "Mes projets" : undefined}
            className={cn(
              "group flex items-center rounded-lg py-2 text-sm transition-all",
              open ? "gap-3 px-3" : "justify-center px-2",
              pathname.startsWith("/projects")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <FolderOpen className={cn("h-4 w-4 flex-shrink-0", pathname.startsWith("/projects") ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            {open && (
              <span className="flex flex-1 items-center justify-between">
                Mes projets
                <ChevronRight className="h-3 w-3 opacity-40" />
              </span>
            )}
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-2 py-3 space-y-0.5">
        <Link
          href="/settings"
          title={!open ? "Paramètres" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
            open ? "px-3" : "justify-center px-2"
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {open && "Paramètres"}
        </Link>
        <button
          onClick={handleLogout}
          title={!open ? "Déconnexion" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all",
            open ? "px-3" : "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {open && "Déconnexion"}
        </button>
      </div>
    </aside>
  );
}
