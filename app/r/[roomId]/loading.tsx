// Affiché tout de suite pendant le chargement d'un onglet : la navigation répond instantanément.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy>
      <div className="h-44 rounded-[1.75rem] bg-zinc-200/70" />
      <div className="h-12 w-2/3 rounded-2xl bg-zinc-200/60" />
      <div className="h-20 rounded-2xl bg-zinc-200/50" />
    </div>
  );
}
