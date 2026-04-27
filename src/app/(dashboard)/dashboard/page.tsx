import Link from "next/link";
import {
  Archive,
  Activity,
  MessageCircle,
  Calendar,
  FileText,
  Image,
  Mic,
  ChevronRight,
} from "lucide-react";

const modules = [
  {
    name: "The Vault",
    href: "/vault",
    icon: Archive,
    description: "Gestion des versions audio, lecteur Hi-Fi et historique des mixs.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    stat: "0 tracks",
  },
  {
    name: "Cue & Feedback",
    href: "/feedback",
    icon: Activity,
    description: "Commentaires temporels précis sur la waveform pour ingénieurs et artistes.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    stat: "0 cues",
  },
  {
    name: "Studio Chat",
    href: "/chat",
    icon: MessageCircle,
    description: "Messagerie type Discord avec canaux privés par rôle.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    stat: "0 messages",
  },
  {
    name: "Timeline",
    href: "/timeline",
    icon: Calendar,
    description: "Calendrier de sorties, sessions studio et deadlines.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    stat: "0 événements",
  },
  {
    name: "Royalties Hub",
    href: "/royalties",
    icon: FileText,
    description: "Gestion des split sheets, contrats et répartition des droits.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    stat: "0 contrats",
  },
  {
    name: "The Gallery",
    href: "/gallery",
    icon: Image,
    description: "Assets graphiques, covers et système de vote pour les visuels.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    stat: "0 assets",
  },
  {
    name: "Stage Prep",
    href: "/stage",
    icon: Mic,
    description: "Gestion des BPM, setlists et fiches techniques live.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    stat: "0 setlists",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Modules</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Accès rapide à tous les outils du projet
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => (
          <Link
            key={mod.name}
            href={mod.href}
            className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-accent/50 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${mod.bg} ${mod.border}`}>
                <mod.icon className={`h-5 w-5 ${mod.color}`} />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">{mod.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {mod.description}
              </p>
            </div>

            <div className={`self-start rounded-md px-2 py-0.5 text-xs font-medium ${mod.bg} ${mod.color}`}>
              {mod.stat}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
