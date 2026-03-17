import type { ReactNode } from "react";

interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  highlights?: string[];
  action?: ReactNode;
}

export function EmptyState({
  eyebrow,
  title,
  description,
  highlights = [],
  action
}: EmptyStateProps) {
  return (
    <section className="kumpa-soft-section overflow-hidden p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.14)] text-2xl">
        +
      </div>
      {eyebrow && <p className="mt-4 kumpa-eyebrow justify-center">{eyebrow}</p>}
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        {description}
      </p>
      {highlights.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {highlights.map((item) => (
            <span key={item} className="kumpa-chip">
              {item}
            </span>
          ))}
        </div>
      )}
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
