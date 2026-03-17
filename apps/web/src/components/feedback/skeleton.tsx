import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted ${className}`.trim()}
      {...props}
    />
  );
}

interface SurfaceSkeletonProps {
  blocks?: number;
  className?: string;
}

export function SurfaceSkeleton({ blocks = 3, className = "" }: SurfaceSkeletonProps) {
  return (
    <div className={`card p-5 ${className}`.trim()}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
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
