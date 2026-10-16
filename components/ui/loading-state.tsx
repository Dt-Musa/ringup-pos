type LoadingVariant = "cards" | "dashboard" | "table";

export function PageLoading({ rows = 4, variant = "cards" }: { rows?: number; variant?: LoadingVariant }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white" />
        ))}
      </div>
      {variant === "dashboard" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-white" />
          <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-white" />
        </div>
      )}
      {(variant === "table" || variant === "dashboard") && (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
