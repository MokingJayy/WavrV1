"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Plus, Download, Trash2, Loader2, Music2, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import SplitChart from "./SplitChart";
import { cn } from "@/lib/utils";
import type { Track, RoyaltySplit, Profile } from "@/types";

interface Props {
  projectId: string;
  tracks: Track[];
  members: { profile: Profile }[];
  initialSplits: RoyaltySplit[];
}

const COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#ec4899"];

export default function RoyaltiesClient({ projectId, tracks, members, initialSplits }: Props) {
  const supabase = createClient();
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id || "");
  const [splits, setSplits] = useState<RoyaltySplit[]>(initialSplits);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [profileId, setProfileId] = useState("");
  const [percentage, setPercentage] = useState<number>(0);
  const [role, setRole] = useState("");

  const currentSplits = useMemo(() => 
    splits.filter(s => s.track_id === selectedTrackId),
  [splits, selectedTrackId]);

  const totalPercentage = useMemo(() => 
    currentSplits.reduce((acc, s) => acc + s.percentage, 0),
  [currentSplits]);

  const handleAddSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !percentage || !role || loading) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("royalty_splits")
      .insert({
        track_id: selectedTrackId,
        profile_id: profileId,
        percentage,
        role
      })
      .select("*, profile:profiles(id, full_name, avatar_url, role)")
      .single();

    if (!error && data) {
      setSplits(prev => [...prev, data as RoyaltySplit]);
      setIsAdding(false);
      setProfileId("");
      setPercentage(0);
      setRole("");
    }
    setLoading(false);
  };

  const handleDeleteSplit = async (id: string) => {
    const { error } = await supabase.from("royalty_splits").delete().eq("id", id);
    if (!error) {
      setSplits(prev => prev.filter(s => s.id !== id));
    }
  };

  const chartData = currentSplits.map(s => ({
    id: s.id,
    name: s.profile?.full_name || "Inconnu",
    role: s.role,
    percentage: s.percentage
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Royalties Hub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Split sheets & répartition des revenus</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedTrackId}
            onChange={(e) => setSelectedTrackId(e.target.value)}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all min-w-[200px]"
          >
            {tracks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition shadow-sm">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border bg-secondary/10">
          <Music2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Aucun track disponible pour ce projet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Uploadez des fichiers dans The Vault d'abord.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Chart */}
          <div className="lg:col-span-5">
            <SplitChart splits={chartData} />
            
            {/* Status indicator */}
            <div className={cn(
              "mt-4 rounded-xl border p-4 flex items-center gap-3 transition-all",
              totalPercentage === 100 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : totalPercentage > 100 
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            )}>
              {totalPercentage === 100 ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">
                  {totalPercentage === 100 ? "Splitheet validée" : 
                   totalPercentage > 100 ? "Total supérieur à 100%" : "Splitheet incomplète"}
                </p>
                <p className="text-[11px] opacity-80 leading-tight">
                  {totalPercentage === 100 ? "Tous les droits sont alloués correctement." : 
                   totalPercentage > 100 ? "Veuillez ajuster les pourcentages." : `Il reste ${100 - totalPercentage}% à allouer.`}
                </p>
              </div>
              <span className="ml-auto text-lg font-black">{totalPercentage}%</span>
            </div>
          </div>

          {/* Right: List & Management */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">Membres du split</span>
                </div>
                {!isAdding && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un membre
                  </button>
                )}
              </div>

              <div className="divide-y divide-border">
                {isAdding && (
                  <form onSubmit={handleAddSplit} className="p-4 bg-secondary/30 space-y-4 animate-in slide-in-from-top duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Collaborateur</label>
                        <select 
                          value={profileId}
                          onChange={(e) => setProfileId(e.target.value)}
                          required
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="">Sélectionner...</option>
                          {members.map(m => (
                            <option key={m.profile.id} value={m.profile.id}>{m.profile.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Rôle</label>
                        <input 
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="Compositeur, Auteur..."
                          required
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Pourcentage (%)</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={percentage || ""}
                          onChange={(e) => setPercentage(parseFloat(e.target.value))}
                          required
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setIsAdding(false)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <button 
                          type="submit"
                          disabled={loading}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {currentSplits.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Users className="h-8 w-8 text-muted-foreground/20 mx-auto" />
                    <p className="text-sm text-muted-foreground">Aucun ayant-droit défini pour ce track.</p>
                    {!isAdding && (
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        Commencer la répartition
                      </button>
                    )}
                  </div>
                ) : (
                  currentSplits.map((split, index) => (
                    <div key={split.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-accent/10 transition-colors">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold border transition-transform group-hover:scale-105"
                        style={{ 
                          backgroundColor: COLORS[index % COLORS.length] + "15", 
                          borderColor: COLORS[index % COLORS.length] + "40",
                          color: COLORS[index % COLORS.length]
                        }}
                      >
                        {split.profile?.avatar_url ? (
                          <img src={split.profile.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                        ) : (
                          split.profile?.full_name[0].toUpperCase()
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{split.profile?.full_name}</p>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">{split.role}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end gap-1 w-32">
                          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${split.percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground">{split.percentage}%</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-foreground tabular-nums">{split.percentage}%</span>
                          <button 
                            onClick={() => handleDeleteSplit(split.id)}
                            className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Legend & Tips */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Note juridique</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ces pourcentages servent de base à la création de votre Split Sheet officielle. Ils n'ont de valeur légale qu'une fois signés par toutes les parties.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Rappel des rôles</p>
                <ul className="text-[10px] text-muted-foreground space-y-1">
                  <li>• Compositeur : Mélodies & thèmes</li>
                  <li>• Auteur : Paroles & textes</li>
                  <li>• Producteur : Réalisation & arrangement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal placeholder for X icon
function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
