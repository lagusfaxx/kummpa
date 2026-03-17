import { SurfaceSkeleton } from "@/components/feedback/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <SurfaceSkeleton blocks={2} />
      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceSkeleton blocks={4} />
        <SurfaceSkeleton blocks={5} />
      </div>
      <SurfaceSkeleton blocks={4} />
    </div>
  );
}
