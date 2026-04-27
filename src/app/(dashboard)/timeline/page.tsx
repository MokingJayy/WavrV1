import { Calendar, Music2, Mic, AlertCircle, Star } from "lucide-react";

const events = [
  { id: "1", title: "Session Mix — Track 01", type: "session", date: "28 avr.", day: "Lun", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: Music2 },
  { id: "2", title: "Deadline Master EP", type: "deadline", date: "2 mai", day: "Ven", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", icon: AlertCircle },
  { id: "3", title: "Release Sortie Single", type: "release", date: "10 mai", day: "Sam", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Star },
  { id: "4", title: "Show — Paris", type: "promo", date: "17 mai", day: "Sam", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: Mic },
];

const typeLabels: Record<string, string> = {
  session: "Session",
  deadline: "Deadline",
  release: "Release",
  promo: "Promo",
};

export default function TimelinePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Timeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Calendrier de sorties & sessions studio</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
          <Calendar className="h-4 w-4" />
          Nouvel événement
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Avril — Mai 2025</span>
        </div>
        <div className="h-32 rounded-lg bg-secondary border border-border flex items-center justify-center">
          <p className="text-xs text-muted-foreground">— Vue calendrier (à venir) —</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Prochains événements</h3>
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex items-center gap-4 rounded-xl border p-4 ${event.bg} transition hover:opacity-90`}
          >
            <div className="text-center w-12 flex-shrink-0">
              <p className="text-xs text-muted-foreground">{event.day}</p>
              <p className={`text-sm font-bold ${event.color}`}>{event.date}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${event.bg}`}>
              <event.icon className={`h-4 w-4 ${event.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <p className={`text-xs ${event.color}`}>{typeLabels[event.type]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
