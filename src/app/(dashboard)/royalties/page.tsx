import { FileText, Plus, Download } from "lucide-react";

const splits = [
  { id: "1", name: "Artiste Principal", role: "Artiste", percentage: 50, track: "Track 01" },
  { id: "2", name: "Co-Producteur", role: "Producteur", percentage: 30, track: "Track 01" },
  { id: "3", name: "Auteur Texte", role: "Auteur", percentage: 20, track: "Track 01" },
];

export default function RoyaltiesPage() {
  const total = splits.reduce((acc, s) => acc + s.percentage, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Royalties Hub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Split sheets & gestion des droits</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition">
            <Download className="h-4 w-4" />
            Exporter
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" />
            Nouveau split
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Track 01 — Split Sheet</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${total === 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {total}% {total === 100 ? "✓ Validé" : "⚠ Incomplet"}
          </span>
        </div>

        <div className="divide-y divide-border">
          {splits.map((split) => (
            <div key={split.id} className="flex items-center gap-4 px-4 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary flex-shrink-0">
                {split.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{split.name}</p>
                <p className="text-xs text-muted-foreground">{split.role}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${split.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground w-10 text-right">
                  {split.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
