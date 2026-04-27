import { Activity, MessageSquareDot, CheckCircle2 } from "lucide-react";

const mockCues = [
  { id: "1", track: "Track 01", time: "01:24", author: "Ingé Son", content: "Baisser la basse ici, masque trop le kick", resolved: false },
  { id: "2", track: "Track 01", time: "02:10", author: "Artiste", content: "Le drop manque d'énergie, augmenter la reverb ?", resolved: false },
  { id: "3", track: "Untitled_02", time: "00:45", author: "Ingé Son", content: "Saturation ok ici, valider ?", resolved: true },
];

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Cue & Feedback</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Commentaires temporels sur la waveform</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Sélectionne un track dans <span className="text-foreground font-medium">The Vault</span> pour afficher sa waveform et ajouter des cues.
          </p>
        </div>
        <div className="h-20 rounded-lg bg-secondary border border-border flex items-center justify-center">
          <p className="text-xs text-muted-foreground">— Waveform —</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Cues récents</h3>
        {mockCues.map((cue) => (
          <div
            key={cue.id}
            className={`flex items-start gap-3 rounded-xl border p-4 transition ${
              cue.resolved
                ? "border-border bg-card opacity-60"
                : "border-blue-500/20 bg-blue-500/5"
            }`}
          >
            {cue.resolved ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            ) : (
              <MessageSquareDot className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-medium text-blue-400">{cue.time}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{cue.track}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-foreground">{cue.author}</span>
              </div>
              <p className="text-sm text-foreground/80">{cue.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
