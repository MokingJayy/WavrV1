"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Music className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-wide">
          Wavr
        </span>
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
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
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
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-2 py-3 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
        >
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
