export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6 sm:mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">{title}</h1>
      {description && <p className="mt-1.5 max-w-3xl text-sm text-zinc-500 sm:text-base">{description}</p>}
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
