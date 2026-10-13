export function PageLoading({ rows = 4 }: { rows?: number }) {
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
      <span className="sr-only">Loading…</span>
    </div>
  );
}
