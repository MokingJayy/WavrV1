import { Archive, Upload, Music2, MoreHorizontal } from "lucide-react";

const mockTracks = [
  { id: "1", title: "Track 01", version: "Mixup", bpm: 140, duration: "3:42", date: "24 avr." },
  { id: "2", title: "Untitled_02", version: "Untitled", bpm: 95, duration: "2:58", date: "22 avr." },
  { id: "3", title: "Intro", version: "Final", bpm: 128, duration: "1:20", date: "20 avr." },
];

const versionColors: Record<string, string> = {
  Mixup: "bg-violet-500/10 text-violet-400",
  Untitled: "bg-zinc-500/10 text-zinc-400",
  Final: "bg-emerald-500/10 text-emerald-400",
  Master: "bg-amber-500/10 text-amber-400",
};

export default function VaultPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">The Vault</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Versions audio & lecteur Hi-Fi</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
          <Upload className="h-4 w-4" />
          Uploader
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center hover:border-primary/30 transition cursor-pointer">
        <Archive className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">Glisser un fichier audio ici</p>
        <p className="text-xs text-muted-foreground mt-1">WAV, AIFF, MP3 — max 500 MB</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-border">
          <span>#</span>
          <span>Titre</span>
          <span>Version</span>
          <span>BPM</span>
          <span>Durée</span>
          <span></span>
        </div>
        {mockTracks.map((track, i) => (
          <div
            key={track.id}
            className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-accent/50 transition group border-b border-border last:border-0"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary group-hover:bg-primary/10 transition">
              <Music2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{track.title}</p>
              <p className="text-xs text-muted-foreground">{track.date}</p>
            </div>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${versionColors[track.version]}`}>
              {track.version}
            </span>
            <span className="text-xs text-muted-foreground">{track.bpm} BPM</span>
            <span className="text-xs text-muted-foreground">{track.duration}</span>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
