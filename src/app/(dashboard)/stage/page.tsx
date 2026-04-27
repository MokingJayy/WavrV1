import { Mic, Plus, GripVertical, Music2, Download } from "lucide-react";

const setlist = [
  { id: "1", order: 1, title: "Intro", bpm: 128, duration: "1:20", key: "Am" },
  { id: "2", order: 2, title: "Track 01", bpm: 140, duration: "3:42", key: "Gm" },
  { id: "3", order: 3, title: "Untitled_02", bpm: 95, duration: "2:58", key: "Fm" },
];

export default function StagePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stage Prep</h2>
          <p className="text-sm text-muted-foreground mt-0.5">BPM, setlists & fiches techniques live</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition">
            <Download className="h-4 w-4" />
            Exporter fiche
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" />
            Nouvelle setlist
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Tracks</p>
          <p className="text-2xl font-bold text-cyan-400">{setlist.length}</p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">BPM moyen</p>
          <p className="text-2xl font-bold text-cyan-400">
            {Math.round(setlist.reduce((a, t) => a + t.bpm, 0) / setlist.length)}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Durée totale</p>
          <p className="text-2xl font-bold text-cyan-400">~8 min</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2">
          <Mic className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Setlist — Show Paris</span>
        </div>

        <div className="divide-y divide-border">
          {setlist.map((track) => (
            <div key={track.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-accent/50 transition">
              <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab" />
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-400 flex-shrink-0">
                {track.order}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary flex-shrink-0">
                <Music2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{track.title}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono bg-secondary rounded px-1.5 py-0.5">{track.key}</span>
                <span>{track.bpm} BPM</span>
                <span>{track.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
