export function PageHeader({
  title,
  description,
  mobileCompact = false,
  actions,
}: {
  title: string;
  description?: string;
  mobileCompact?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className={`text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white ${mobileCompact ? "max-sm:text-xl" : ""}`}>{title}</h1>
        {description && <p className={`mt-1.5 max-w-3xl text-sm text-zinc-500 sm:text-base ${mobileCompact ? "max-sm:hidden" : ""}`}>{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </header>
  );
}

export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700">
      {children}
    </div>
  );
}
