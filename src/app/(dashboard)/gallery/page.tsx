import { Image, Upload, ThumbsUp } from "lucide-react";

const mockAssets = [
  { id: "1", title: "Cover Option A", type: "cover", votes: 7, author: "Designer" },
  { id: "2", title: "Cover Option B", type: "cover", votes: 4, author: "Artiste" },
  { id: "3", title: "Visual Promo 1", type: "promo", votes: 2, author: "Designer" },
  { id: "4", title: "Logo v3", type: "logo", votes: 5, author: "Manager" },
];

const typeColors: Record<string, string> = {
  cover: "bg-pink-500/10 text-pink-400",
  promo: "bg-violet-500/10 text-violet-400",
  logo: "bg-blue-500/10 text-blue-400",
};

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">The Gallery</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Assets graphiques & système de vote</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
          <Upload className="h-4 w-4" />
          Ajouter un asset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {mockAssets.map((asset) => (
          <div
            key={asset.id}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition"
          >
            <div className="aspect-square rounded-lg bg-secondary border border-border flex items-center justify-center">
              <Image className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground truncate">{asset.title}</p>
              <p className="text-xs text-muted-foreground">{asset.author}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${typeColors[asset.type]}`}>
                {asset.type}
              </span>
              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition">
                <ThumbsUp className="h-3 w-3" />
                {asset.votes}
              </button>
            </div>
          </div>
        ))}

        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border hover:border-primary/30 transition cursor-pointer">
          <div className="text-center">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground/40" />
            <p className="mt-1 text-xs text-muted-foreground">Ajouter</p>
          </div>
        </div>
      </div>
    </div>
  );
}
