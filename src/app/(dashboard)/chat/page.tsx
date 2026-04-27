import { Hash, Lock, Send } from "lucide-react";

const channels = [
  { id: "1", name: "général", private: false, unread: 3 },
  { id: "2", name: "ingé-son", private: true, unread: 0 },
  { id: "3", name: "artistes", private: true, unread: 1 },
  { id: "4", name: "management", private: true, unread: 0 },
];

const mockMessages = [
  { id: "1", author: "Ingé Son", time: "14:32", content: "J'ai uploadé la nouvelle version du mix, allez checker dans The Vault 🔥" },
  { id: "2", author: "Artiste", time: "14:35", content: "Reçu, j'écoute et je laisse des cues" },
  { id: "3", author: "Manager", time: "14:50", content: "La deadline pour la master c'est vendredi !" },
];

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-48 flex-shrink-0 rounded-xl border border-border bg-card p-3 space-y-1">
        <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Canaux
        </p>
        {channels.map((ch) => (
          <button
            key={ch.id}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
              ch.id === "1"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {ch.private ? (
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <Hash className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="flex-1 text-left">{ch.name}</span>
            {ch.unread > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {ch.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">général</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mockMessages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                {msg.author[0]}
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-foreground">{msg.author}</span>
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                </div>
                <p className="text-sm text-foreground/80">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <input
              type="text"
              placeholder="Message dans #général..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
