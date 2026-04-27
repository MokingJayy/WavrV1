import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Archive, Activity, MessageCircle, Calendar, FileText,
  Image, Mic, HardDrive, ArrowLeft, Users, Settings2,
} from "lucide-react";
import type { Project } from "@/types";

const MODULES = [
  { name: "The Vault",      slug: "vault",     icon: Archive,       description: "Gérer les versions audio",         color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", hover: "hover:border-violet-500/40 hover:bg-violet-500/15" },
  { name: "Cue & Feedback", slug: "feedback",  icon: Activity,      description: "Commentaires sur la timeline",      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",     hover: "hover:border-blue-500/40 hover:bg-blue-500/15" },
  { name: "Studio Chat",    slug: "chat",      icon: MessageCircle, description: "Messagerie par rôle",               color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20",hover: "hover:border-emerald-500/40 hover:bg-emerald-500/15" },
  { name: "Timeline",       slug: "timeline",  icon: Calendar,      description: "Calendrier et deadlines",           color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   hover: "hover:border-amber-500/40 hover:bg-amber-500/15" },
  { name: "Royalties Hub",  slug: "royalties", icon: FileText,      description: "Split sheets & contrats",           color: "text-rose-400",   bg: "bg-rose-500/10 border-rose-500/20",     hover: "hover:border-rose-500/40 hover:bg-rose-500/15" },
  { name: "The Gallery",    slug: "gallery",   icon: Image,         description: "Assets visuels & covers",           color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20",     hover: "hover:border-pink-500/40 hover:bg-pink-500/15" },
  { name: "Sessions DAW",   slug: "sessions",  icon: HardDrive,     description: "Ableton · FL Studio · Logic",       color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",     hover: "hover:border-cyan-500/40 hover:bg-cyan-500/15" },
  { name: "Stage Prep",     slug: "stage",     icon: Mic,           description: "BPM sets & fiches live",            color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", hover: "hover:border-orange-500/40 hover:bg-orange-500/15" },
];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { count: memberCount } = await supabase
    .from("project_members")
    .select("*", { count: "exact", head: true })
    .eq("project_id", id);

  const p = project as Project;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tous les projets
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{p.name}</h1>
          {p.description && (
            <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {memberCount ?? 0} membre{(memberCount ?? 0) !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              Créé le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
        <Link
          href={`/projects/${id}/manage`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition flex-shrink-0"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Gérer
        </Link>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MODULES.map(({ name, slug, icon: Icon, description, color, bg, hover }) => (
          <Link
            key={slug}
            href={`/projects/${id}/${slug}`}
            className={`group flex flex-col gap-4 rounded-2xl border p-5 transition-all ${bg} ${hover}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
