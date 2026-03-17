import type { ReactNode } from "react";

interface PageIntroProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageIntro({ title, description, actions }: PageIntroProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
