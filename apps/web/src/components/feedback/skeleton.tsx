import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`.trim()}
      {...props}
    />
  );
}

interface SurfaceSkeletonProps {
  blocks?: number;
  className?: string;
  compact?: boolean;
}

export function SurfaceSkeleton({
  blocks = 3,
  className = "",
  compact = false
}: SurfaceSkeletonProps) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur ${className}`.trim()}
    >
      <div className="space-y-3">
        <Skeleton className={`h-4 ${compact ? "w-28" : "w-32"}`} />
        <Skeleton className={`h-8 ${compact ? "w-1/2" : "w-2/3"}`} />
        <div className="space-y-2">
          {Array.from({ length: blocks }).map((_, index) => (
            <Skeleton
              key={index}
              className={`h-4 ${index === blocks - 1 ? "w-5/6" : "w-full"}`}
            />
          ))}
        </div>
        {!compact && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-28" />
          </div>
        )}
      </div>
    </div>
  );
}
