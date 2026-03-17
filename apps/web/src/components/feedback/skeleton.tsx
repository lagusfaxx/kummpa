import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[hsl(var(--muted))] ${className}`.trim()}
      {...props}
    >
      <div className="absolute inset-0 animate-[pulse_1.7s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,hsl(0_0%_100%_/_0.55),transparent)]" />
    </div>
  );
}

interface SurfaceSkeletonProps {
  blocks?: number;
  compact?: boolean;
  className?: string;
}

export function SurfaceSkeleton({
  blocks = 3,
  compact = false,
  className = ""
}: SurfaceSkeletonProps) {
  return (
    <div className={`kumpa-panel ${compact ? "p-4" : "p-5"} ${className}`.trim()}>
      <div className={`${compact ? "space-y-2" : "space-y-3"}`}>
        <Skeleton className={`${compact ? "h-4 w-1/2" : "h-5 w-1/3"}`} />
        <Skeleton className={`${compact ? "h-3 w-3/4" : "h-4 w-2/3"}`} />
        {!compact && <Skeleton className="h-36 w-full rounded-[1.3rem]" />}
        <div className="space-y-2">
          {Array.from({ length: blocks }).map((_, index) => (
            <Skeleton
              key={index}
              className={`h-4 ${index === blocks - 1 ? "w-4/5" : "w-full"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
