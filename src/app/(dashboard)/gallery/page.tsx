import { Image as ImageIcon, Hammer, Sparkles } from "lucide-react";

export default function GalleryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative h-24 w-24 rounded-3xl border border-primary/20 bg-card flex items-center justify-center shadow-xl">
          <ImageIcon className="h-10 w-10 text-primary" strokeWidth={1.5} />
          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Hammer className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mt-10 text-center max-w-md space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" />
          Bientôt disponible
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">The Gallery</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cette section est en cours de développement.<br />
          Tu pourras bientôt y stocker tes covers, visuels promo, photoshoots et tous les assets graphiques de tes projets.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 opacity-40 max-w-sm w-full">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl border border-dashed border-border bg-secondary/20"
          />
        ))}
      </div>
    </div>
  );
}
