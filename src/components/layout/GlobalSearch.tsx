"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, FolderRoot, Archive, Activity, MessageCircle, Calendar, FileText, Image as ImageIcon, Mic, HardDrive, Settings2, Command, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface SearchResult {
  id: string;
  title: string;
  type: "project" | "navigation" | "module";
  url: string;
  icon: React.ElementType;
  subtitle?: string;
}

const NAV_ITEMS = [
  { title: "Mes Projets", url: "/projects", icon: FolderRoot },
  { title: "Paramètres", url: "/settings", icon: Settings2 },
];

const MODULE_ITEMS = [
  { title: "The Vault", slug: "vault", icon: Archive, description: "Gérer les versions audio" },
  { title: "Cue & Feedback", slug: "feedback", icon: Activity, description: "Commentaires sur la timeline" },
  { title: "Studio Chat", slug: "chat", icon: MessageCircle, description: "Messagerie par rôle" },
  { title: "Timeline", slug: "timeline", icon: Calendar, description: "Calendrier et deadlines" },
  { title: "Royalties Hub", slug: "royalties", icon: FileText, description: "Split sheets & contrats" },
  { title: "The Gallery", slug: "gallery", icon: ImageIcon, description: "Assets visuels & covers" },
  { title: "Sessions DAW", slug: "sessions", icon: HardDrive, description: "Ableton · FL Studio · Logic" },
  { title: "Stage Prep", slug: "stage", icon: Mic, description: "BPM sets & fiches live" },
];

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut to open (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const q = query.toLowerCase();

      // 1. Static navigation items
      const navMatches: SearchResult[] = NAV_ITEMS.filter(item => 
        item.title.toLowerCase().includes(q)
      ).map(item => ({
        id: item.url,
        title: item.title,
        type: "navigation",
        url: item.url,
        icon: item.icon
      }));

      // 2. Project modules
      const moduleMatches: SearchResult[] = MODULE_ITEMS.filter(m => 
        m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      ).map(m => ({
        id: `module-${m.slug}`,
        title: m.title,
        type: "module",
        url: `/projects/[id]/${m.slug}`, // Will need replacement if selected
        icon: m.icon,
        subtitle: m.description
      }));

      // 3. Dynamic projects from Supabase
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, description")
        .ilike("name", `%${query}%`)
        .limit(5);

      const projectMatches: SearchResult[] = (projects || []).map(p => ({
        id: p.id,
        title: p.name,
        type: "project",
        url: `/projects/${p.id}`,
        icon: FolderRoot,
        subtitle: p.description || "Projet"
      }));

      setResults([...navMatches, ...projectMatches, ...moduleMatches]);
      setIsLoading(false);
      setSelectedIndex(0);
    };

    const timer = setTimeout(performSearch, 150);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  const handleSelect = (result: SearchResult) => {
    // If it's a generic module search, go to projects list if no project is active
    // Ideally we'd detect the current project ID, but for now we go to the URL
    router.push(result.url);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <>
      {/* Search trigger button in header */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
      >
        <Search className="h-4 w-4" />
        <span className="text-xs font-medium pr-8">Rechercher...</span>
        <kbd className="hidden sm:flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 sm:pt-24"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Input Header */}
            <div className="relative flex items-center border-b border-border p-4">
              <Search className="h-5 w-5 text-muted-foreground mr-3" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher un projet, un module, un track..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
              />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
              <button 
                onClick={() => setIsOpen(false)}
                className="ml-3 p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results List */}
            <div 
              ref={scrollRef}
              className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide"
            >
              {!query.trim() && (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-muted-foreground">Saisissez quelque chose pour commencer la recherche...</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {NAV_ITEMS.map(item => (
                      <button
                        key={item.url}
                        onClick={() => router.push(item.url)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                      >
                        <item.icon className="h-3 w-3" />
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {query.trim() && results.length === 0 && !isLoading && (
                <div className="px-4 py-12 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-foreground">Aucun résultat trouvé pour &quot;{query}&quot;</p>
                  <p className="text-xs text-muted-foreground mt-1">Essayez d&apos;autres mots-clés.</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all group",
                        selectedIndex === index ? "bg-primary/10 border border-primary/20" : "bg-transparent border border-transparent hover:bg-accent/50"
                      )}
                    >
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        selectedIndex === index ? "bg-primary/20 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground group-hover:text-foreground"
                      )}>
                        <result.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-sm font-semibold truncate",
                            selectedIndex === index ? "text-primary" : "text-foreground"
                          )}>
                            {result.title}
                          </p>
                          <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {result.type}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
                        )}
                      </div>
                      <kbd className={cn(
                        "hidden sm:block ml-auto text-[10px] font-bold opacity-0 transition-opacity",
                        selectedIndex === index && "opacity-100"
                      )}>
                        ENTRER
                      </kbd>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with tips */}
            <div className="flex items-center gap-4 border-t border-border bg-secondary/20 px-4 py-3 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px]">↑↓</kbd>
                <span>Naviguer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px]">ENTRER</kbd>
                <span>Sélectionner</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px]">ESC</kbd>
                <span>Fermer</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
