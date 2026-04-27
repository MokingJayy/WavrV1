"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Archive,
  Activity,
  MessageCircle,
  Calendar,
  FileText,
  Image,
  Mic,
  Settings,
  LogOut,
  Music,
  HardDrive,
  PanelLeftOpen,
  PanelLeftClose,
  FolderOpen,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Projets",
    href: "/projects",
    icon: FolderOpen,
    description: "Gestion des projets",
  },
  {
    name: "The Vault",
    href: "/vault",
    icon: Archive,
    description: "Audio & versions",
  },
  {
    name: "Cue & Feedback",
    href: "/feedback",
    icon: Activity,
    description: "Commentaires waveform",
  },
  {
    name: "Studio Chat",
    href: "/chat",
    icon: MessageCircle,
    description: "Messagerie par rôle",
  },
  {
    name: "Timeline",
    href: "/timeline",
    icon: Calendar,
    description: "Calendrier sorties",
  },
  {
    name: "Royalties Hub",
    href: "/royalties",
    icon: FileText,
    description: "Split sheets & contrats",
  },
  {
    name: "The Gallery",
    href: "/gallery",
    icon: Image,
    description: "Assets & covers",
  },
  {
    name: "Sessions DAW",
    href: "/sessions",
    icon: HardDrive,
    description: "Ableton · FL · Logic · PT",
  },
  {
    name: "Stage Prep",
    href: "/stage",
    icon: Mic,
    description: "BPM & fiches live",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

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
      <div className="flex h-16 items-center border-b border-border px-2 gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
        {open && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-wide">
              Wavr
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              title={!open ? item.name : undefined}
              className={cn(
                "group flex items-center rounded-lg py-2 text-sm transition-all",
                open ? "gap-3 px-3" : "justify-center px-2",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {open && item.name}
            </Link>
          );
        })}
      </nav>

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
